-- Demo brand: BrightPath Learning (fictional online learning app).
-- Run in Supabase → SQL Editor AFTER schema.sql. Safe to re-run.
-- Content: Member 6 · Loaded by: Member 3

delete from terms;
delete from facts;
delete from rules;

insert into rules (id, category, text, severity) values
 ('R-01','tone','Tone is friendly, encouraging and respectful — never pushy, fear-based or sarcastic.','warning'),
 ('R-02','tone','Use simple, clear English. Avoid slang such as "lit", "dope" or "bro".','warning'),
 ('R-03','messaging','Talk about what learners gain and how we support them, not about beating or criticising other platforms.','warning'),
 ('R-04','terminology','Say "learners", never "students" or "clients".','warning'),
 ('R-05','terminology','Never name competitors in our content.','blocker'),
 ('R-06','terminology','Always write the brand name as "BrightPath" (capital B and P, no space).','warning'),
 ('R-07','terminology','Say "affordable", never "cheap".','warning'),
 ('R-08','claims','Only publish numbers and statistics that are in the Approved Facts list.','blocker'),
 ('R-09','claims','Never promise guaranteed results, jobs, marks or "100%" outcomes.','blocker'),
 ('R-10','claims','No superlatives such as "#1", "best" or "fastest" unless an approved fact supports them.','blocker'),
 ('R-11','tone','Do not write words in ALL CAPS.','suggestion'),
 ('R-12','tone','Use at most one exclamation mark at a time.','suggestion'),
 ('R-13','tone','Use at most 2 emojis per post.','suggestion'),
 ('R-14','readability','Keep sentences under 30 words.','suggestion'),
 ('R-15','accessibility','Don''t rely on colour alone (e.g. "click the green button"); describe actions in words.','suggestion');

insert into terms (term, type, replacement, rule_id) values
 ('clients','banned','learners','R-04'),
 ('client','banned','learner','R-04'),
 ('students','banned','learners','R-04'),
 ('student','banned','learner','R-04'),
 ('cheap','banned','affordable','R-07'),
 ('cheapest','banned','most affordable','R-07'),
 ('lit','banned','exciting','R-02'),
 ('dope','banned','great','R-02'),
 ('bro','banned','friend','R-02'),
 ('LearnLeap','competitor','other platforms','R-05'),
 ('StudyNova','competitor','other platforms','R-05'),
 ('SkillSprint','competitor','other platforms','R-05'),
 ('Brightpath','misspelling','BrightPath','R-06'),
 ('Bright Path','misspelling','BrightPath','R-06'),
 ('brightpath','misspelling','BrightPath','R-06'),
 ('learners','preferred',null,'R-04'),
 ('affordable','preferred',null,'R-07');

insert into facts (id, claim, source, expires_on) values
 ('F-01','50,000+ learners','BrightPath Annual Report 2026','2027-03-31'),
 ('F-02','1,200+ video lessons','Content library audit, Oct 2026','2027-03-31'),
 ('F-03','Courses in 6 Indian languages','Product team, Sep 2026','2027-06-30'),
 ('F-04','4.7 rating on Google Play','Google Play listing, Nov 2026','2027-01-31'),
 ('F-05','92% course completion rate','Learner survey 2025','2026-06-30'),
 ('F-06','Founded in 2019','Company registration','2099-12-31'),
 ('F-07','200+ partner colleges','Partnerships team, Mar 2026','2026-09-30'),
 ('F-08','Free 7-day trial','Pricing page, Nov 2026','2027-12-31'),
 ('F-09','Certificates recognised by 150+ companies','Employer partnerships list 2026','2027-03-31'),
 ('F-10','Live doubt-solving sessions every weekday','Product team, Nov 2026','2027-12-31');
