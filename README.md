# Deep Research Project  
  
"## 业务流程"  
  
"1. 用户发起搜索指令"  
"2. 系统拆解问题并执行网页搜索"  
"3. 保存搜索结果"  
"4. 基于搜索结果生成研究报告"  
  
"## 数据库设计"  
  
"### SearchResult (搜索结果)"  
"- 保存用户的原始搜索查询"  
"- 关联多个SearchSubQuery"  
  
"### SearchSubQuery (子问题)"  
"- 保存拆解后的子问题"  
"- 关联SearchResult"  
"- 关联多个SearchItem"  
  
"### SearchItem (搜索项)"  
"- 保存每个子问题的搜索结果"  
"- 包含URL、标题、摘要、图像路径等信息"  
"- 关联SearchSubQuery"  
  
"### ResearchResult (研究报告)"  
"- 保存基于搜索结果生成的研究报告"  
"- research: {search_id: 检索任务的id, full_text: 报告全文}" 
