import React, { useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  CheckBox, Button, TextField, Icon,
} from 'choerodon-ui/pro';
import './FieldList.less';
import { IChosenFieldField, IUseChoseFieldProps } from './types';
import ChoseFieldStore from './store';

const prefix = 'c7nagile-choose-field-list';

export function useChoseFieldStore(props: IUseChoseFieldProps) {
  return useMemo(() => new ChoseFieldStore(props), []);
}
interface Props {
  store: ChoseFieldStore,
  closeMenu: () => void,
  onChose: ((v: IChosenFieldField | IChosenFieldField[], status: 'add' | 'del') => void) | undefined
}
function FieldList({ store, closeMenu, onChose }: Props) {
  const currentOptionStatus = store.getCurrentOptionStatus;
  const [systemFields, customFields] = store.getFields;
  function handleChange(value: string | undefined, field: IChosenFieldField) {
    if (value) {
      onChose && onChose(field, 'add');
      store.addChosenFields(value, field);
    } else {
      onChose && onChose(field, 'del');
      store.delChosenFields(field.code);
    }
  }
  return (
    <div
      className={prefix}
    >
      <div className={`${prefix}-search`}>
        <TextField
          style={{ flex: 1 }}
          value={store.getSearchVal}
          onChange={(v) => {
            store.setSearchVal(v);
          }}
          prefix={<Icon type="search" />}
          placeholder="输入文字以进行过滤"
          clearButton
        />
      </div>
      <div className={`${prefix}-header`}>
        <CheckBox
          indeterminate={currentOptionStatus === 'PART'}
          checked={currentOptionStatus === 'ALL'}
          onChange={(checkAll) => {
            if (checkAll) {
              closeMenu(); // 避免焦点丢失时无法再次点击添加筛选
              const data = store.addAllChosenFields();
              onChose && onChose(data, 'add');
            } else {
              const data = store.cancelAllChosenFields();
              onChose && onChose(data, 'del');
            }
          }}
        >
          全选
        </CheckBox>
        <Button
          style={{ display: currentOptionStatus !== 'NONE' ? 'inline-block' : 'none' }}
          onClick={() => {
            const data = store.cancelAllChosenFields();
            onChose && onChose(data, 'del');
          }}
        >
          清除筛选项
        </Button>
      </div>
      <div className={`${prefix}-content`}>
        {systemFields.length > 0 && (
          <div className={`${prefix}-section`}>
            <div className={`${prefix}-title`}>预定义字段</div>
            <div className={`${prefix}-list`}>
              {systemFields.map((field) => {
                const { name, code } = field;
                const disabled = typeof (field.immutableCheck) !== 'undefined';
                return (
                  <div className={`${prefix}-item`} key={code}>
                    <CheckBox
                      value={code}
                      disabled={disabled}
                      checked={disabled ? field.immutableCheck : !!store.getChosenByCode(code)}
                      onChange={(value) => handleChange(value, field)}
                    >
                      {name}
                    </CheckBox>
                  </div>
                );
              })}

            </div>
          </div>
        )}
        {customFields.length > 0 && (
          <div className={`${prefix}-section`}>
            <div className={`${prefix}-title`}>自定义字段</div>
            <div className={`${prefix}-list`}>
              {customFields.map((field) => {
                const { name, code } = field;
                const disabled = typeof (field.immutableCheck) !== 'undefined';
                return (
                  <div className={`${prefix}-item`} key={code}>
                    <CheckBox
                      value={code}
                      disabled={disabled}
                      checked={disabled ? field.immutableCheck : !!store.getChosenByCode(code)}
                      onChange={(value) => handleChange(value, field)}
                    >
                      {name}
                    </CheckBox>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default observer(FieldList);
