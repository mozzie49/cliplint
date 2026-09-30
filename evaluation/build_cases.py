from pathlib import Path
import json, hashlib
ROOT=Path(__file__).parent
cases=[]

def add(id,language,focus,source,clip,title,copy,labels,why,mode='flag',episode=None,tags=None):
    cues=[]
    for i,c in enumerate(source):
        start,end,text,*speaker=c
        cue={'id':f'{id}-c{i+1}','start':start,'end':end,'text':text}
        if speaker: cue['speaker']=speaker[0]
        cues.append(cue)
    cases.append({'id':id,'synthetic':True,'language':language,'episode_id':episode or id,'focus':focus,
        'source_cues':cues,'clip_ranges':[{'start':a,'end':b} for a,b in clip],
        'title':title,'copy':copy,'expected':{'mode':mode,'labels':labels,
        'rationale':why,'evidence_cue_ids':[c['id'] for c in cues]},'tags':tags or []})

# Numeric values, unit semantics, and numeric role binding.
add('N01','en','changed integer',[(0,5,'We enrolled 12 volunteers in the pilot.','Maya')],[(0,5)],'Pilot enrolled 21 volunteers','',['numeric_mismatch'],'The sole enrollment count is 12, not 21.',episode='pilot-count')
add('N02','en','percent vs percentage points',[(0,6,'Conversion rose from 20% to 23%, an increase of 3 percentage points.','Maya')],[(0,6)],'Conversion increased by 3%','',['numeric_mismatch'],'A 3-percentage-point increase from 20% is a 15% relative increase, not 3%.',episode='conversion-change')
add('N03','zh','same value wrong unit',[(0,5,'优化后，单次请求延迟为80毫秒。','林工')],[(0,5)],'优化后延迟仅80秒','',['numeric_mismatch'],'80秒与80毫秒相差一千倍。')
add('N04','en','magnitude word swap',[(0,5,'The synthetic project cost $2 million in total.','Ari')],[(0,5)],'Project cost $2 billion','',['numeric_mismatch'],'The magnitude changed from million to billion.')
add('N05','zh','range converted to certainty',[(0,6,'在这项模拟中，预计节省10%到20%的时间。','李')],[(0,6)],'确定节省20%的时间','',['numeric_mismatch','omitted_condition'],'A forecast range is presented as a guaranteed upper endpoint; simulation and uncertainty are omitted.')
add('N06','en','numeric relation reversal',[(0,6,'The error rate was below 0.05%, not 5%.','Ari')],[(0,6)],'Error rate reached 5%','',['numeric_mismatch','negation_reversal'],'5% appears only in an explicitly negated comparison, not as the observed error rate.')
add('N07','zh','Chinese numeral magnitude',[(0,5,'这批设备的预算是三十万元。','陈')],[(0,5)],'设备预算三百万元','',['numeric_mismatch'],'三十万变成三百万，数值扩大十倍。')
add('N08','en','all numbers present but roles swapped',[(0,7,'Last year we processed 50 cases; this year we processed 5.','Ari')],[(0,7)],'This year: 50 cases','Last year: 5',['numeric_mismatch'],'Token membership is insufficient: both numbers exist but their temporal roles are swapped.')
add('N09','zh','fullwidth punctuation harmless',[(0,6,'样本中的比例为１２．５％。','周')],[(0,6)],'样本中的比例为12.5%','',[],'Fullwidth and ASCII digit/punctuation forms denote the same value.','clear',episode='numeric-normalization')
add('N10','en','equivalent unit conversion',[(0,5,'Each response took 1500 milliseconds.','Maya')],[(0,5)],'Each response took 1.5 seconds','',[],'1500 ms equals 1.5 s; a lexical number difference is not evidence of distortion.','clear')
add('N11','mixed','editorial number not factual claim',[(0,5,'先做备份，再测试，最后上线。','林工')],[(0,5)],'3 steps before launch','先备份，再测试，最后上线',[],'Three is the count of the explicitly listed steps, not an invented source statistic.','clear')
add('N12','en','accurate percentage-point statement',[(0,6,'Conversion rose from 20% to 23%, an increase of 3 percentage points.','Maya')],[(0,6)],'Conversion up 3 percentage points','',[],'Exact percentage-point statement is faithful.','clear',episode='conversion-change')

# Conditions, exceptions, hedges, and negation, including context omitted by cuts.
add('C01','en','condition in previous cue',[(0,3,'This applies only if the backup completes successfully.','Maya'),(3,7,'Then you can delete the temporary copy.','Maya')],[(3,7)],'You can delete the temporary copy','',['omitted_condition','incomplete_reference'],'The selected instruction depends on a success condition outside the clip.')
add('C02','zh','exception removed',[(0,4,'这个结论不适用于未成年人。','陈'),(4,8,'对这次研究中的成年人，结果成立。','陈')],[(4,8)],'这个结论适用于所有人','',['omitted_condition'],'The title universalizes a finding explicitly limited to adults in this study.')
add('C03','en','negation dropped in copy',[(0,5,'We do not recommend skipping the validation step.','Maya')],[(0,5)],'Validation advice','We recommend skipping the validation step.',['negation_reversal'],'Removing do not reverses the recommendation.')
add('C04','zh','double-negative misread',[(0,5,'并不是所有实验都没有效果；有两个显示了改善。','周')],[(0,5)],'所有实验都没有效果','',['negation_reversal'],'The source rejects the universal no-effect claim asserted by the title.')
add('C05','en','tentative claim made categorical',[(0,6,'This may improve retention in the small pilot, but we have not established causation.','Ari')],[(0,6)],'This causes better retention','',['omitted_condition'],'May, pilot scope, and causal uncertainty are removed.')
add('C06','mixed','unless exception omitted',[(0,6,'The retry is safe unless the operation charges the card twice. 重复扣款时不能直接重试。','Lin')],[(0,6)],'Retries are always safe','',['omitted_condition'],'The explicit repeated-charge exception is erased.')
add('C07','en','faithful conditional paraphrase',[(0,7,'If the backup completes successfully, you can delete the temporary copy.','Maya')],[(0,7)],'Delete the temporary copy only after a successful backup','',[],'The required backup condition is retained in different syntax.','clear')
add('C08','zh','idiomatic negation harmless',[(0,6,'不只是速度更快，界面也更容易使用。','林工')],[(0,6)],'更快，也更易用','',[],'不只是 means not only; removing the idiom in a faithful summary does not reverse a negative claim.','clear')
add('C09','en','negation words in different subject',[(0,6,'No tickets remain unresolved. Every reported issue is closed.','Maya')],[(0,6)],'All reported issues are closed','',[],'The affirmative paraphrase correctly expresses the negative source sentence.','clear')

# Verbatim quote support versus formatting and explicitly marked omissions.
add('Q01','en','invented direct quotation',[(0,6,'We are still assessing whether the approach is suitable.','Maya')],[(0,6)],'Maya: “This is guaranteed to work.”','',['unsupported_quote'],'The direct quote is absent and contradicts the tentative source.')
add('Q02','zh','quote edit changes substantive word',[(0,5,'我认为这个方案值得测试。','李')],[(0,5)],'李：“这个方案已经成功。”','',['unsupported_quote'],'Worth testing is replaced by already succeeded inside quotation marks.')
add('Q03','en','quote assembled across contrast',[(0,4,'We should ship the prototype to internal testers.','Ari'),(4,8,'We should not ship it to customers yet.','Ari')],[(0,8)],'“We should ship it to customers”','',['unsupported_quote','negation_reversal'],'The asserted direct quote is not a supported contiguous utterance and removes not.')
add('Q04','en','quote attributed to wrong context',[(0,4,'A vendor slogan says, “Never fails.”','Maya'),(4,8,'That slogan is misleading; failures do happen.','Maya')],[(0,8)],'Maya says her method “Never fails”','',['misattribution','omitted_condition'],'A rejected vendor slogan is represented as Maya’s endorsement; the literal quote is present but the attribution/stance is false.')
add('Q05','mixed','unmarked translation presented verbatim',[(0,6,'这个方法还需要更多验证。','林工')],[(0,6)],'Lin: “This method needs more validation.”','',['insufficient_evidence'],'Translation is plausible, but the original English words were not spoken; an unlabelled cross-language direct quote requires editorial verification.','abstain')
add('Q06','en','curly quotes whitespace normalization',[(0,6,'The plan is simple: test, learn, and repeat.','Maya')],[(0,6)],'“The plan is simple: test, learn, and repeat.”','',[],'Curly enclosing quote marks do not make an otherwise exact quote unsupported.','clear')
add('Q07','zh','Chinese punctuation quote normalization',[(0,6,'先测试，再上线。','林工')],[(0,6)],'林工说：「先测试，再上线。」','',[],'Chinese quotation marks preserve the complete exact sentence.','clear')
add('Q08','en','clearly marked quote omission',[(0,7,'We tested carefully, documented every result, and released the patch.','Maya')],[(0,7)],'“We tested carefully … and released the patch.”','',[],'The visible ellipsis omits an intervening clause without changing meaning.','clear')
add('Q09','en','straight apostrophe is not quotation',[(0,6,"The team's plan wasn't ready on Tuesday.",'Maya')],[(0,6)],"The team's plan wasn't ready on Tuesday",'',[],'Apostrophes in contractions and possession must not be parsed as fabricated quotations.','clear')

# Attribution: identity, reported speech, and absent speaker metadata.
add('A01','en','wrong named speaker',[(0,5,'I support the proposed timetable.','Maya'),(5,10,'I oppose the proposed timetable.','Leo')],[(0,10)],'Leo supports the timetable','',['misattribution'],'The supporting position belongs to Maya, while Leo opposes it.')
add('A02','zh','host question changed to guest claim',[(0,4,'你是否认为明年一定盈利？','主持人'),(4,8,'我没有这样说，现在无法判断。','嘉宾')],[(0,8)],'嘉宾：明年一定盈利','',['misattribution','negation_reversal'],'The host’s question is falsely presented as the guest’s claim despite an explicit rejection.')
add('A03','mixed','reported claim treated as endorsement',[(0,6,'Alex said the rollout was safe. 我不同意Alex的判断。','Bo')],[(0,6)],'Bo: the rollout was safe','',['misattribution','negation_reversal'],'Bo reports Alex’s view and explicitly disagrees; the title gives Bo the opposite stance.')
add('A04','en','accurate named attribution',[(0,5,'I support the proposed timetable.','Maya'),(5,10,'I oppose the proposed timetable.','Leo')],[(0,10)],'Maya supports the timetable; Leo opposes it','',[],'Both positions are correctly assigned.','clear')
add('A05','zh','speaker identity unavailable',[(0,6,'我支持这个方案。')],[(0,6)],'王博士支持这个方案','',['insufficient_evidence'],'No speaker metadata or self-identification establishes that the speaker is 王博士; identity cannot be verified.','abstain')
add('A06','en','title names topic not speaker',[(0,6,'Maya’s book explains three common editing mistakes.','Leo')],[(0,6)],'Maya’s book: editing mistakes explained','',[],'Naming the author of a discussed book is not attributing Leo’s utterance to Maya.','clear')

# Discontinuous edits, preservation of contrast, and source-order problems.
add('S01','en','split retraction dropped',[(0,4,'At first, we believed the service was reliable.','Maya'),(4,8,'That belief was wrong after the full test.','Maya'),(8,12,'The failure rate was unacceptable.','Maya')],[(0,4),(8,12)],'The service was reliable','',['misleading_splice','omitted_condition'],'The title turns an explicitly retracted prior belief into the final conclusion; the cut removes the retraction.')
add('S02','zh','split removes intervening negation',[(0,3,'有人说这个补丁解决了所有问题。','林工'),(3,6,'但这不是真的。','林工'),(6,10,'我们仍在逐项验证。','林工')],[(0,3),(6,10)],'补丁解决了所有问题','',['misleading_splice','negation_reversal'],'The intervening denial is removed and reported speech is presented as established fact.')
add('S03','en','juxtaposition changes causal relation',[(0,4,'We launched the new logo in May.','Ari'),(4,8,'The profit increase came from a one-time tax credit, unrelated to the logo.','Ari'),(8,12,'Profit increased that quarter.','Ari')],[(0,4),(8,12)],'New logo boosted profit','',['misleading_splice','omitted_condition'],'The removed cue explicitly rules out the causal relationship the title introduces.')
add('S04','zh','chronology reversed across ranges',[(0,4,'早期我们曾支持这个方案。','陈'),(4,8,'验证之后，我们决定否决这个方案。','陈')],[(4,8),(0,4)],'最终决定：支持这个方案','',['misleading_splice'],'Reversed source order ends on the old position and title falsely labels it the final decision.')
add('S05','en','safe discontinuous list',[(0,4,'First, save a copy of the document.','Maya'),(4,8,'Let me take a sip of water.','Maya'),(8,12,'Second, check the recipient before sending.','Maya')],[(0,4),(8,12)],'Save a copy and check the recipient','',[],'Removing an unrelated pause between independent steps does not distort the advice.','clear')
add('S06','zh','same-speaker adjacent ranges benign',[(0,4,'今天介绍两条建议：先备份。','林工'),(4,8,'再检查文件权限。','林工')],[(0,4),(4,8)],'两条建议：备份，检查权限','',[],'Adjacent ranges preserve all source content and chronology.','clear')
add('S07','en','irrelevant omitted context benign',[(0,4,'The key finding is that the archive is intact.','Maya'),(4,9,'Our meeting room changed from Oak to Cedar.','Maya'),(9,13,'No archived file was lost.','Maya')],[(0,4),(9,13)],'The archive is intact; no file was lost','',[],'The omitted scheduling detail is irrelevant to the complete archive claim.','clear')

# Incomplete referents and sentence boundaries.
add('R01','en','unresolved leading pronoun',[(0,4,'The second backup failed its checksum.','Maya'),(4,8,'It should not be used for recovery.','Maya')],[(4,8)],'Recovery warning','',['incomplete_reference'],'The selected clip contains only it with its identity outside the clip.')
add('R02','zh','deictic opening depends on omitted cue',[(0,4,'问题在于同时修改两份主文件。','林工'),(4,8,'这样做会造成冲突。','林工')],[(4,8)],'这样做会造成冲突','',['incomplete_reference'],'这样做 lacks the action it refers to inside the selected clip.')
add('R03','en','unfinished clause at clip end',[(0,4,'The plan will work only if','Ari'),(4,8,'the data quality checks pass.','Ari')],[(0,4)],'The plan will work','',['incomplete_reference','omitted_condition'],'The selected content ends on only if and omits the mandatory completion.')
add('R04','en','pronoun resolved within selection',[(0,4,'The second backup failed its checksum.','Maya'),(4,8,'It should not be used for recovery.','Maya')],[(0,8)],'Do not use the failed second backup for recovery','',[],'The referent is explicitly present before the pronoun in the selected clip.','clear')
add('R05','zh','visual referent unknown',[(0,5,'请点击这里，然后选这个。','林工')],[(0,5)],'操作演示','',['insufficient_evidence'],'The audio transcript depends on visible UI pointers; neither the referents nor a distortion can be established without video.','abstain')

# Abstention and source limitations, not claims about truth in the world.
add('U01','en','world truth outside source scope',[(0,6,'The Moon is made of cheese.','Fictional narrator')],[(0,6)],'The Moon is made of cheese','',['insufficient_evidence'],'The title is source-faithful; transcript comparison cannot verify real-world truth and must not certify factual correctness.','abstain',tags=['source_faithful','world_truth_unassessed'])
add('U02','mixed','sarcasm requires prosody',[(0,6,'Great, another perfect release. 真是太棒了。','Bo')],[(0,6)],'Bo celebrates a perfect release','',['insufficient_evidence'],'Without delivery and contextual evidence this could be sincere or sarcastic; textual surface match cannot verify stance.','abstain')
add('U03','en','cut falls inside cue',[(0,10,'We do not support skipping the safety review.','Maya')],[(3,8)],'We support skipping the safety review','',['insufficient_evidence'],'Cue-level timing cannot determine which words survive an internal cut; word-level audio alignment is needed.','abstain',tags=['partial_cue'])
add('U04','zh','ASR uncertainty marked',[(0,6,'成本是[听不清：十五/五十]万元。','陈')],[(0,6)],'成本五十万元','',['insufficient_evidence'],'Explicit ASR ambiguity prevents verification of the amount; choosing one alternative should not be certified.','abstain')
add('U05','en','unannotated edit effect unknown',[(0,5,'It was an ordinary Tuesday morning.','Maya')],[(0,5)],'An ordinary Tuesday morning','',['insufficient_evidence'],'The supplied transcript cannot assess omitted on-screen text, music, thumbnails, or visual juxtaposition.','abstain',tags=['text_faithful','audiovisual_effects_unassessed'])
add('U06','zh','no source text supplied',[],[(0,5)],'这个方案已经得到验证','',['insufficient_evidence'],'No source evidence is available, so neither source support nor contradiction can be established.','abstain',tags=['missing_source'])

assert len(cases)==54,len(cases)
labels={l for c in cases for l in c['expected']['labels']}
setdoc={'schema_version':'1.0','name':'ClipLint independent synthetic adversarial evaluation v1','synthetic':True,
 'disclaimer':'All people, episodes and factual scenarios are synthetic. This small challenge set is not representative and cannot establish real-world accuracy, safety, or editorial correctness.',
 'creation_method':'Authored and labels fixed independently before reading or executing the implementation. Gold labels are semantic requirements, not a list of rules known to be implemented.',
 'clip_range_semantics':'Half-open source-time intervals in listed playback order. Whole cues are used except explicitly tagged partial-cue abstention cases.',
 'label_ontology':{
  'numeric_mismatch':'A numeric value, magnitude, unit, relation, or role asserted by title/copy conflicts with supplied source context.',
  'omitted_condition':'A necessary qualification, scope, exception, hedge, or causal limitation is removed, creating a materially stronger/different claim.',
  'negation_reversal':'A source negation or explicitly rejected stance is reversed by title/copy or chosen content.',
  'unsupported_quote':'Material presented as a direct quotation is not supported by the attributed source utterance, after harmless formatting normalization.',
  'misattribution':'A claim or stance is falsely assigned to a named speaker; reporting a claim is not endorsing it.',
  'misleading_splice':'Discontinuous selection or reordering removes or changes a meaning-critical relationship between passages.',
  'incomplete_reference':'The selected transcript has an unresolved textual reference or unfinished meaning-critical clause.',
  'insufficient_evidence':'Available text/timing/speaker metadata cannot establish the requested conclusion; avoid affirmative certification and identify the limit.'},
 'cases':cases}
(ROOT/'cases.synthetic.v1.json').write_text(json.dumps(setdoc,ensure_ascii=False,indent=2)+'\n')

malformed=[
 {'id':'M01','synthetic':True,'description':'Negative cue start','source_cues':[{'id':'c1','start':-1,'end':2,'text':'Hello.'}],'clip_ranges':[{'start':0,'end':2}],'title':'Hello','copy':'','expected':'Reject or return an explicit validation error; do not silently clamp and certify.'},
 {'id':'M02','synthetic':True,'description':'Cue end precedes start','source_cues':[{'id':'c1','start':5,'end':2,'text':'Hello.'}],'clip_ranges':[{'start':0,'end':6}],'title':'Hello','copy':'','expected':'Reject or return an explicit validation error.'},
 {'id':'M03','synthetic':True,'description':'Zero-length clip range','source_cues':[{'id':'c1','start':0,'end':2,'text':'Hello.'}],'clip_ranges':[{'start':1,'end':1}],'title':'Hello','copy':'','expected':'Reject or return an explicit validation error, never clean supported output.'},
 {'id':'M04','synthetic':True,'description':'Timestamp string instead of number','source_cues':[{'id':'c1','start':'bad','end':2,'text':'Hello.'}],'clip_ranges':[{'start':0,'end':2}],'title':'Hello','copy':'','expected':'Reject or return an explicit validation error.'},
 {'id':'M05','synthetic':True,'description':'Duplicate cue identifiers','source_cues':[{'id':'same','start':0,'end':2,'text':'Hello.'},{'id':'same','start':2,'end':4,'text':'Goodbye.'}],'clip_ranges':[{'start':0,'end':4}],'title':'Greeting','copy':'','expected':'Reject, explicitly warn, or safely reassign unique IDs while preserving evidence provenance.'},
 {'id':'M06','synthetic':True,'description':'Null required cue text','source_cues':[{'id':'c1','start':0,'end':2,'text':None}],'clip_ranges':[{'start':0,'end':2}],'title':'Hello','copy':'','expected':'Reject or return an explicit validation error.'},
 {'id':'M07','synthetic':True,'description':'Clip selection outside source extent','source_cues':[{'id':'c1','start':0,'end':2,'text':'Hello.'}],'clip_ranges':[{'start':30,'end':40}],'title':'Hello','copy':'','expected':'Explicitly report empty/uncovered selection; do not claim source support.'},
 {'id':'M08','synthetic':True,'description':'Reversed clip range','source_cues':[{'id':'c1','start':0,'end':5,'text':'Hello.'}],'clip_ranges':[{'start':4,'end':1}],'title':'Hello','copy':'','expected':'Reject or return an explicit validation error.'},
]
(ROOT/'malformed.synthetic.v1.json').write_text(json.dumps({'schema_version':'1.0','synthetic':True,'not_in_semantic_metrics':True,'cases':malformed},ensure_ascii=False,indent=2)+'\n')
manifest={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'cases.synthetic.v1.json',ROOT/'malformed.synthetic.v1.json']}
(ROOT/'frozen-manifest.json').write_text(json.dumps({'version':'v1','frozen_before_engine_inspection':True,'files':manifest},indent=2)+'\n')
from collections import Counter
print('cases',len(cases),'modes',dict(Counter(c['expected']['mode'] for c in cases)),'languages',dict(Counter(c['language'] for c in cases)))
print('label supports',dict(Counter(l for c in cases for l in c['expected']['labels'])))
print(json.dumps(manifest,indent=2))
