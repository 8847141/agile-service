package io.choerodon.agile.app.service.impl;

import io.choerodon.agile.api.vo.IssueLinkTypeCreateVO;
import io.choerodon.agile.api.vo.IssueLinkTypeSearchVO;

import io.choerodon.agile.infra.utils.PageUtil;
import io.choerodon.core.domain.Page;

import io.choerodon.agile.api.vo.IssueLinkTypeVO;
import io.choerodon.agile.infra.dto.IssueLinkDTO;
import io.choerodon.agile.infra.dto.IssueLinkTypeDTO;
import io.choerodon.agile.infra.mapper.IssueLinkMapper;
import io.choerodon.mybatis.pagehelper.PageHelper;
import io.choerodon.mybatis.pagehelper.domain.PageRequest;

import io.choerodon.core.exception.CommonException;
import org.modelmapper.ModelMapper;
import org.modelmapper.TypeToken;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.choerodon.agile.app.assembler.IssueLinkTypeAssembler;
import io.choerodon.agile.app.service.IssueLinkTypeService;
import io.choerodon.agile.infra.mapper.IssueLinkTypeMapper;
import org.springframework.util.CollectionUtils;

import java.util.List;


/**
 * @author dinghuang123@gmail.com
 * @since 2018/6/14
 */
@Service
@Transactional(rollbackFor = Exception.class)
public class IssueLinkTypeServiceImpl implements IssueLinkTypeService {

    private static final String UPDATE_ERROR = "error.IssueLinkType.update";
    private static final String INSERT_ERROR = "error.IssueLinkType.create";

    @Autowired
    private IssueLinkTypeMapper issueLinkTypeMapper;
    @Autowired
    private IssueLinkTypeAssembler issueLinkTypeAssembler;
    @Autowired
    private IssueLinkMapper issueLinkMapper;
    @Autowired
    private ModelMapper modelMapper;

    @Override
    public Page<IssueLinkTypeVO> listIssueLinkType(Long projectId, Long issueLinkTypeId, IssueLinkTypeSearchVO issueLinkTypeSearchVO, PageRequest pageRequest) {
        Page<IssueLinkTypeDTO> page = PageHelper.doPageAndSort(pageRequest, () -> issueLinkTypeMapper.queryIssueLinkTypeByProjectId(projectId, issueLinkTypeId, issueLinkTypeSearchVO.getLinkName(), issueLinkTypeSearchVO.getContents()));
        List<IssueLinkTypeDTO> content = page.getContent();
        if(CollectionUtils.isEmpty(content)){
            return new Page<>();
        }
        return PageUtil.buildPageInfoWithPageInfoList(page,modelMapper.map(content,new TypeToken<List<IssueLinkTypeVO>>() {}.getType()));
    }

    @Override
    public IssueLinkTypeVO createIssueLinkType(IssueLinkTypeCreateVO issueLinkTypeCreateVO) {
        IssueLinkTypeDTO issueLinkTypeDTO = issueLinkTypeAssembler.toTarget(issueLinkTypeCreateVO, IssueLinkTypeDTO.class);
        return modelMapper.map(create(issueLinkTypeDTO), IssueLinkTypeVO.class);
    }

    @Override
    public IssueLinkTypeVO updateIssueLinkType(IssueLinkTypeVO issueLinkTypeVO) {
        return modelMapper.map(update(modelMapper.map(issueLinkTypeVO, IssueLinkTypeDTO.class)), IssueLinkTypeVO.class);
    }

    @Override
    public int deleteIssueLinkType(Long issueLinkTypeId, Long toIssueLinkTypeId, Long projectId) {
        if (toIssueLinkTypeId != null) {
            batchUpdateRelToIssueLinkType(issueLinkTypeId, toIssueLinkTypeId);
        } else {
            deleteIssueLinkTypeRel(issueLinkTypeId);
        }
        return delete(issueLinkTypeId, projectId);
    }

    @Override
    public IssueLinkTypeVO queryIssueLinkType(Long projectId, Long linkTypeId) {
        IssueLinkTypeDTO issueLinkTypeDTO = new IssueLinkTypeDTO();
        issueLinkTypeDTO.setProjectId(projectId);
        issueLinkTypeDTO.setLinkTypeId(linkTypeId);
        return modelMapper.map(issueLinkTypeMapper.selectOne(issueLinkTypeDTO), IssueLinkTypeVO.class);
    }

    @Override
    public void initIssueLinkType(Long projectId) {
        IssueLinkTypeDTO duplicate = new IssueLinkTypeDTO();
        duplicate.initDuplicate(projectId);
        IssueLinkTypeDTO blocks = new IssueLinkTypeDTO();
        blocks.initBlocks(projectId);
        IssueLinkTypeDTO relates = new IssueLinkTypeDTO();
        relates.initRelates(projectId);
        create(duplicate);
        create(blocks);
        create(relates);
    }

    @Override
    public boolean queryIssueLinkTypeName(Long projectId, String issueLinkTypeName, Long issueLinkTypeId) {
        return issueLinkTypeMapper.queryIssueLinkTypeName(projectId, issueLinkTypeName, issueLinkTypeId) == 0;
    }


    @Override
    public IssueLinkTypeDTO update(IssueLinkTypeDTO issueLinkTypeDTO) {
        if (issueLinkTypeMapper.updateByPrimaryKeySelective(issueLinkTypeDTO) != 1) {
            throw new CommonException(UPDATE_ERROR);
        }
        return issueLinkTypeMapper.selectByPrimaryKey(issueLinkTypeDTO.getLinkTypeId());
    }

    @Override
    public IssueLinkTypeDTO create(IssueLinkTypeDTO issueLinkTypeDTO) {
        if (issueLinkTypeMapper.insert(issueLinkTypeDTO) != 1) {
            throw new CommonException(INSERT_ERROR);
        }
        IssueLinkTypeDTO query = new IssueLinkTypeDTO();
        query.setLinkTypeId(issueLinkTypeDTO.getLinkTypeId());
        return issueLinkTypeMapper.selectByPrimaryKey(issueLinkTypeDTO.getLinkTypeId());
    }

    @Override
    public int delete(Long linkTypeId, Long projectId) {
        IssueLinkTypeDTO issueLinkTypeDTO = new IssueLinkTypeDTO();
        issueLinkTypeDTO.setLinkTypeId(linkTypeId);
        issueLinkTypeDTO.setProjectId(projectId);
        return issueLinkTypeMapper.delete(issueLinkTypeDTO);
    }

    @Override
    public int deleteIssueLinkTypeRel(Long issueLinkTypeId) {
        IssueLinkDTO issueLinkDTO = new IssueLinkDTO();
        issueLinkDTO.setLinkTypeId(issueLinkTypeId);
        return issueLinkMapper.delete(issueLinkDTO);
    }

    @Override
    public int batchUpdateRelToIssueLinkType(Long issueLinkTypeId, Long toIssueLinkTypeId) {
        return issueLinkMapper.batchUpdateRelToIssueLinkType(issueLinkTypeId, toIssueLinkTypeId);
    }
}
