# Risk register

Qualitative estimates for planning, pending pilot observations. Likelihood and impact use low, medium and high. Module identifies where the solo developer or pilot operator should act; it does not imply a staffed team.

| Risk and root cause | Likelihood / impact | Mitigation and detection | Residual exposure | Responsible module / priority |
|---|---|---|---|---|
| No authority adoption because nobody owns a queue | High/high | Use a simulated desk, obtain an owner and contact procedure before live intake | Repairs depend on staffing | Pilot operations / MVP |
| Fake reports from low-cost accounts | Medium/medium | Verified session, quotas, photo review, hide and audit | Convincing false reports need inspection | Intake/moderation / MVP |
| AI misclassification from ambiguous images | High/medium | Editable suggestions, manual fallback and labeled evaluation | Human confirmation can still be wrong | AI adapter / MVP |
| False duplicate between adjacent assets | High/medium | Show alternatives, require confirmation, preserve originals | GPS drift can also miss real matches | Matching / MVP |
| Unfair ranking from uneven participation | Medium/high | Cap votes, show breakdown, review critical items separately | Quiet areas may receive less support | Queue / MVP |
| Vote manipulation through multiple accounts | Medium/medium | Unique vote, quotas and anomaly review | Coordinated accounts remain possible | Votes/auth / MVP |
| False resolution based on staff assertion | Medium/high | Resolution note, evidence option, author confirmation and reopen review | Author may never respond | Workflow / MVP |
| Wrong GPS from denied permission or poor fix | High/medium | Manual pin, coordinate controls and explicit review | User can confirm wrong fixture | Map/intake / MVP |
| Privacy leak through photos, text or coordinates | Medium/high | Strip EXIF, private media, approximate peer DTO, retention review | Small campus may reveal location indirectly | Storage/read service / MVP |
| Unauthorized admin access from bad grants | Medium/high | Trusted provisioning, server checks and direct RLS tests | Compromised valid staff session | Identity / MVP |
| API quota exhaustion during demo | Medium/medium | Budget limits, bounded calls and manual fallback | Optional analysis unavailable | Integrations / MVP |
| External outage breaks submission | Medium/high | Independent manual intake for AI; retry database writes with same key | Core persistence needs Supabase | Services / MVP |
| High operating costs from repeated analysis or media | Medium/high | Actor quotas, budget cutoff, staged cleanup and usage alerts | Sudden demand can exceed estimates | Operations / MVP |
| Accessibility barriers from map-only UI | Medium/high | Equivalent list, keyboard coordinates, labels and zoom checks | Assistive technology diversity | Design system / MVP |
| Weak connectivity loses work | High/medium | Preserve open form, bounded uploads, explicit retry and stable keys | Closing browser can lose draft | Intake / MVP |
| Competing portals already meet local needs | Medium/medium | Compare existing campus workflow with pilot tasks before expansion | Institution may prefer existing channel | Product discovery / future |
| Scaling limits from distance scans and vote aggregation | Medium/medium | Bounding boxes, indexes, pagination and query measurement | Dense areas may need PostGIS or summaries | Data access / future |
| Emergency misuse due to perceived dispatch | Medium/high | Non-emergency notice, separate manual contact procedure | User may still wait for help | Intake/operations / MVP |
| Legal uncertainty around photos and retention | Medium/high | Use demo data, obtain local governance review and deletion process | Rules depend on institution and jurisdiction | Privacy operations / MVP |

Review new incidents alongside [open questions](21-OPEN-QUESTIONS.md). Record changed assumptions or accepted residual risks in the [decision log](20-DECISION-LOG.md).
