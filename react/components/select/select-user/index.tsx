import React, {
  useMemo, forwardRef, useState, useCallback, useEffect,
} from 'react';
import { Select } from 'choerodon-ui/pro';
import { find, unionBy } from 'lodash';
import { userApi } from '@/api';
import useSelect, { SelectConfig } from '@/hooks/useSelect';
import type { User } from '@/common/types';
import { SelectProps } from 'choerodon-ui/pro/lib/select/Select';

const toArray = (something: any) => (Array.isArray(something) ? something : [something]);
export interface SelectUserProps extends Partial<SelectProps> {
  // 由于用户是分页的，有时候已选的用户不在第一页，这时候传id过来，会直接显示id，这里多传一个用户过来，放到options里
  selectedUser?: User | User[],
  autoQueryConfig?: {
    selectedUserIds: string[], /** 需要加载的用户id列表 */
    userMaps?: Map<string, User>, /** 已加载的用户缓存，当存在多次使用此组件时， 可传入一个userMaps做全局缓存 */
    taskStacks?: string[], /** 任务队列，组件将要加载的用户id 队列 */
    finishStack?: string[], /** 完成任务队列 ，当任务队列>=任务队列时将触发通知加载完成事件 */
    forceRefresh?: any, /** 强制刷新 */
    events?: {
      onFinish?: (finishStacks: string[], userMaps: Map<string, User>) => void,
    }
  },
  extraOptions?: {
    id: string,
    realName: string,
  }[],
  dataRef?: React.MutableRefObject<any>
  request?: SelectConfig<User>['request']
  afterLoad?: (users: User[]) => void
}
interface MemberLocalMapConfig {
  userMaps?: Map<string, User>,
  finishStack?: string[],
  taskStacks?: string[],
  forceRefresh?: any,
  events?: {
    onFinish?: (finishStacks: string[], userMaps: Map<string, User>) => void, /** 完成所有加载任务后返回数据 */
  }
}
interface MemberLocalStoreMapDataProps {
  userMaps: Map<string, User>,
  cacheMode: 'outer' | 'inner',
  taskStacks: Array<string>,
  finishStack: Array<string>,
  forceRefresh?: any,
  finish: boolean | undefined,
}
interface MemberLocalStoreMapMethodProps {
  addOneQueryUser: (id: string) => void,
}
function useMemberLocalStoreMap(config?: MemberLocalMapConfig): [MemberLocalStoreMapDataProps, MemberLocalStoreMapMethodProps] {
  const [finish, setFinish] = useState<boolean>();
  const [innerMode, setInnerMode] = useState<'outer' | 'inner'>('inner');
  const userMaps = useMemo(() => {
    if (config?.userMaps) {
      setInnerMode('outer');
      return config.userMaps;
    }
    return new Map<string, User>();
  }, [config?.userMaps]);

  const taskStacks = useMemo(() => {
    if (config?.taskStacks) {
      return config?.taskStacks;
    }
    return new Array<string>();
  }, [config?.taskStacks]);

  const finishStack = useMemo(() => {
    if (config?.finishStack) {
      return config?.finishStack;
    }
    return new Array<string>();
  }, [config?.finishStack]);
  const key = useMemo(() => Math.round(Math.random() * 1000), []);
  let timeoutId: any;
  const autoAxiosGetUser = useCallback((ids: string[]) => {
    while (ids.length > 0) {
      const id = ids.pop();
      if (id && !userMaps.has(id!)) {
        // @ts-ignore
        userMaps.set(id, { id });
        userApi.getById(id).then((res: any) => {
          const { list } = res;
          if (list[0]) {
            userMaps.set(id!, { ...list[0], id: String(list[0].id) });
          }
          finishStack.push(id);
          console.log(`${key} Select.user_id:${id}`, finishStack);
          if (finishStack.length === userMaps.size) {
            setFinish(true);
            config?.events?.onFinish && config?.events?.onFinish(finishStack, userMaps);
          }
        });
      }
    }
  }, [config?.events]);

  useEffect(() => {
    if (taskStacks.length > 0 && typeof (finish) === 'boolean' && !finish) {
      console.log('taskStacks....');
      autoAxiosGetUser(taskStacks);
    }
  }, [autoAxiosGetUser, finish, taskStacks]);

  const startTask = () => {
    if (typeof (timeoutId) !== 'undefined') {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      setFinish(false);
    }, 200);
  };
  const handleAdd = (id: string) => {
    if (!taskStacks.find((item) => item === id)) {
      taskStacks.push(id);
      startTask();
    }
  };
  const dataProp = {
    userMaps,
    cacheMode: innerMode,
    taskStacks,
    finishStack,
    forceRefresh: config?.forceRefresh,
    finish,
  };
  const methods = {
    addOneQueryUser: handleAdd,
  };
  return [dataProp, methods];
}
const SelectUser: React.FC<SelectUserProps> = forwardRef(({
  selectedUser, extraOptions, dataRef, request, afterLoad, autoQueryConfig, ...otherProps
}, ref: React.Ref<Select>) => {
  const [loadExtraData, loadExtraDataMethod] = useMemberLocalStoreMap(autoQueryConfig);
  const autoQueryUsers = (ids: string[], currentData: User[]) => {
    const idSets = new Set<string>(ids);
    let newIds = Array.from(idSets);
    for (let i = 0; i < currentData.length; i += 1) {
      if (idSets.size === 0) {
        break;
      }
      const iUser = currentData[i];
      if (newIds.some((item) => String(item) === String(iUser.id))) {
        idSets.delete(String(iUser.id));
        newIds = Array.from(idSets);
      }
    }
    if (idSets.size > 0) {
      newIds.map((item) => loadExtraDataMethod.addOneQueryUser(item));
    }
  };
  const config = useMemo((): SelectConfig<User> => ({
    name: 'user',
    textField: 'realName',
    valueField: 'id',
    request: request || (async ({ filter, page }) => {
      const res = await userApi.getAllInProject(filter, page);
      res.list = res.list.filter((user: User) => user.enabled);
      return res;
    }),
    middleWare: (data) => {
      let newData = [];
      const temp: User[] = [];
      if (selectedUser) {
        (toArray(selectedUser).forEach((user) => {
          temp.push({ ...user, id: String(user.id) });
        }));
      }
      // 存在待加载的id，第一页有数据，finish未准备状态（即值不boolean类型 false）则开始自动加载
      if (autoQueryConfig?.selectedUserIds && data.length > 0 && (typeof (loadExtraData.finish) === 'undefined')) {
        autoQueryUsers(autoQueryConfig?.selectedUserIds, data);
      }
      if (loadExtraData.finish || loadExtraData.forceRefresh || loadExtraData.cacheMode === 'outer') {
        (autoQueryConfig?.selectedUserIds || []).forEach((item) => {
          if (loadExtraData.userMaps.has(item)) {
            console.log('item....', item);
            temp.push(loadExtraData.userMaps.get(item)!);
          }
        });
      }

      newData = [...(extraOptions || []), ...data].map((item: User) => ({ ...item, id: String(item.id) }));
      newData = unionBy<User>(temp, newData, 'id');// 去重
      if (dataRef) {
        Object.assign(dataRef, {
          current: newData,
        });
      }
      if (afterLoad) {
        afterLoad(newData);
      }
      console.log('newData....', newData);
      return newData;
    },
  }), [selectedUser, loadExtraData.forceRefresh, loadExtraData.finish]);
  const props = useSelect(config);
  return (
    <Select
      ref={ref}
      clearButton={false}
      {...props}
      {...otherProps}
    />
  );
});
export default SelectUser;
