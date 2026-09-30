export const zhRules = {
 QUOTE_ATTRIBUTION_MISMATCH:{title:'引述措辞匹配到另一位明确标注的说话人',message:'引述文本在原稿中存在，但明确的说话人信息可能与文案归因不一致。',suggestion:'对照录音与说话人标注核对归因。原稿的身份标注本身也可能有误。'},
 RANGE_INVALID:{title:'原片时间范围无效',message:'指定时间范围无法用于完整审校，请先修正。',suggestion:'对照原始媒体和逐字稿，检查开始与结束时间后重新运行。'},
 RANGE_EMPTY:{title:'时间范围内没有逐字稿',message:'没有字幕片段与此范围重叠，无法检查言语与上下文。',suggestion:'检查时间轴对齐，或补充这部分的逐字稿。'},
 RANGE_OVERLAP:{title:'保留的时间段发生重叠',message:'两个或多个时间范围重复使用了原片内容。',suggestion:'确认重复是有意安排，或删除重叠部分。'},
 PARTIAL_CUE:{title:'剪辑边界切入了字幕片段',message:'字幕只有整句时间戳。虽然时间段重叠，但无法确定哪些词实际保留。',suggestion:'逐一听取切点，或使用词级时间戳。不要把整句显示当成整句已保留。'},
 OMITTED_QUALIFIER:{title:'片段附近的限定语未被保留',message:'相邻但未保留的原话含有条件、否定或限定表达，可能影响片段含义。',suggestion:'连同前后文一起收听。若限定语改变了原意，请保留必要上下文或调整文案。'},
 DANGLING_OPENING:{title:'开头可能依赖更早的上下文',message:'所选片段以指代或结果表达开头，观众可能缺少被省略的前提。',suggestion:'确认观众能识别指代对象；必要时延长开头或添加忠实的背景说明。'},
 STITCH_CONTEXT:{title:'不同原片位置的拼接需要复核',message:'保留段之间的原始时间不连续，需要检查拼接是否改变语境。',suggestion:'对照每处连接点的原始上下文，核对顺序、话题与限定条件。'},
 NUMBER_MISMATCH:{title:'发布文案的数字未匹配所选原文',message:'文案中的一个数量未匹配到所选字幕，且原文存在同类单位的其他数量。',suggestion:'对照录音核对数字及其指代。规则不计算涨幅，也不能判断合法换算或四舍五入。'},
 NUMBER_OUTSIDE_CLIP:{title:'文案中的数字只在未保留部分出现',message:'该数量在完整原稿中找到，但不在已完整保留的字幕中。',suggestion:'核对文案是否准确引用更广的采访内容，并为观众补足必要背景。'},
 QUOTE_NOT_FOUND:{title:'引号内的措辞未在原稿中找到',message:'逐字稿未匹配到发布文案中的引述措辞。',suggestion:'对照录音核对引语。若是意译，不应把它当作已验证的直接引述。'},
 QUOTE_OUTSIDE_CLIP:{title:'引述措辞出现在未保留的原文中',message:'引述在完整原稿中找到，但不在所选片段中。',suggestion:'检查引用是否有足够背景，或将对应的原话加入片段。'}
};
