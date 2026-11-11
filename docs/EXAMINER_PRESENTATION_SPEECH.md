# VeritasAI: Final Academic Presentation Speech (Clear English Edition)

- **Candidate:** Michael Mazhambe
- **Degree:** Bachelor of Science in Information Technology
- **Project:** VeritasAI — Multimodal Credibility Engine for Real-Time Disinformation Detection
- **Target Presentation Duration:** 10–12 Minutes
- **Live Interactive Slide Deck:** Accessible directly inside the running application at `/presentation`

---

## Speaker Delivery Tips for Presentation Day

1. **Speak at a steady, conversational pace:** Do not rush. Take a breath between slides.
2. **Use everyday examples:** The alien attack story is your superpower—it shows you actually tested the system, found a real flaw, and engineered a smart fix.
3. **Point to the screen:** When talking about the 4 pillars or the database telemetry, point your hand or mouse to the cards.
4. **Confidence is key:** You built every part of this system—from the React frontend and FastAPI backend to MongoDB TTL indexes and the dual backup engine. You know it better than anyone in the room.

---

## Presentation Timing Guide

| Phase | Slide / Topic | Target Time | What to Focus On |
| :--- | :--- | :--- | :--- |
| **Intro** | Slide 1: Welcome & Overview | 0:00 - 1:00 | Introduce yourself, title, and the main goal |
| **Problem** | Slide 2: Why Fake News is a Big Problem | 1:00 - 2:15 | Why current AI tools fail (black boxes, hallucination) |
| **Architecture** | Slide 3: The 4-Pillar Pipeline | 2:15 - 3:30 | The 4 independent checks working together |
| **Pillar 1** | Slide 4: Language AI (RoBERTa Transformer) | 3:30 - 4:30 | Highlighting suspicious words and active learning |
| **Pillar 2** | Slide 5: Writing Style & Clickbait (Forensic NLP) | 4:30 - 5:30 | Word variety, sentence structure, clickbait gap |
| **Pillar 3** | Slide 6: Fact Checking & The Alien Breakthrough | 5:30 - 6:45 | How you stopped false matches on satire and jokes |
| **Pillar 4** | Slide 7: Website Reputation & University Trust | 6:45 - 7:30 | Domain age, MBFC database, SSL, `.ac.za` trust |
| **Database** | Slide 8: Database & MongoDB Setup | 7:30 - 8:15 | 4 collections, TTL index that auto-deletes OTPs |
| **Resilience** | Slide 9: Dual Backup & Disaster Recovery | 8:15 - 9:15 | 3-2-1 backup, auto-pruning, browser zip restore |
| **Security** | Slide 10: Security & Password Reset | 9:15 - 10:00 | Disposable email block, Gmail SMTP, OTP reset |
| **Results** | Slide 11: Real Test Results & Speed | 10:00 - 10:45 | 93.4% accuracy, 680ms speed, journalism feedback |
| **Wrap-up** | Slide 12: Summary & Live Demo Transition | 10:45 - 11:30 | Final summary, transition to live demo and Q&A |

---

## Verbatim Presentation Script (Clear & Conversational English)

### Slide 1: Title & Overview (0:00 - 1:00)

> **[SHOW SLIDE 1 ON SCREEN]**
>
> *"Good morning respected examiners, supervisors, and lecturers.*
>
> *My name is Michael Mazhambe. Today, I am proud to present my final BSc Information Technology dissertation project: **VeritasAI**, a real-time credibility engine built to detect fake news and digital misinformation.*
>
> *Right now, most people who want to check if an article is real use general AI tools like ChatGPT or basic classifiers. But those tools have a huge problem: they are black boxes. They give you an answer, but they cannot show you where they got their facts, why they made that decision, or whether they simply made it up.*
>
> *VeritasAI was built to fix this. Instead of guessing, it breaks down an article using four independent checks: the writing style, grammar patterns, real-world facts from live news wires, and the website's background. Then, it gives you a transparent score backed by a digital audit certificate.*
>
> *Over the next ten minutes, I will show you how the system is built, how our database and backup engines keep it reliable, and the real-world results we achieved."*

---

### Slide 2: Why Fake News is a Real Problem (1:00 - 2:15)

> **[CLICK NEXT TO SLIDE 2]**
>
> *"To understand why we need VeritasAI, let's look at why existing fact-checking tools fail.*
>
> *A famous study published in Science magazine showed that fake news spreads six times faster than verified real news on social media. Fake stories are designed to trigger strong emotions—anger, fear, or shock—so people share them immediately without checking. Today, automated bots and generative AI tools allow bad actors to produce thousands of convincing fake stories in minutes for almost zero cost.*
>
> *When we look at current tools, there are three major weaknesses:*
>
> *First: **AI Hallucinations.** Large language models often invent fake citations. If you are a journalist, an academic, or a citizen, you cannot defend a decision using an AI that makes things up.*
>
> *Second: **Simple Keyword Search Fails.** Many older tools just search for matching keywords. If an article is satire, a joke, or quotes an absurd rumor to debunk it, simple keyword filters get confused and call it real.*
>
> *Third: **Throwaway Fake Websites.** Scammers frequently register a fake website like 'bbc-breaking-news.co', leave it up for 24 hours to spread a rumor, and then delete it. Most checkers only analyze the words on the page and never check how old the domain is or if its security certificate is valid.*
>
> *VeritasAI was specifically engineered to solve all three of these weaknesses."*

---

### Slide 3: The 4-Pillar Multimodal Pipeline (2:15 - 3:30)

> **[CLICK NEXT TO SLIDE 3: POINT TO THE 4 CARDS]**
>
> *"Here on Slide 3 is the core blueprint of VeritasAI: our 4-Pillar Pipeline.*
>
> *When a user pastes an article or submits a link, our Python FastAPI backend cleans up the text, removes ads, and immediately runs four independent checks at the exact same time:*
>
> *1. **Pillar 1: Deep Linguistic AI (40% of the score):** Uses our fine-tuned RoBERTa transformer to analyze deceptive writing patterns and highlight suspicious words.*
> *2. **Pillar 2: Forensic Writing Style & Grammar (15% of the score):** Checks sentence structure, vocabulary variety, and whether the headline is exaggerating compared to the article.*
> *3. **Pillar 3: Live Fact Checking (25% of the score):** Searches Wikipedia and live news wires to see if the main claims actually happened in the real world.*
> *4. **Pillar 4: Website Background & Infrastructure (20% of the score):** Looks up the publisher in our database of over 4,000 news outlets, checks the domain registration age on WHOIS, and inspects the SSL certificate.*
>
> *These four results are combined into a final credibility score between 0 and 100. If the score is valid, VeritasAI issues an encrypted digital certificate. The entire check finishes in less than one second—on average, 680 milliseconds."*

---

### Slide 4: Pillar 1 — Language AI & RoBERTa (3:30 - 4:30)

> **[CLICK NEXT TO SLIDE 4]**
>
> *"Let's take a closer look at Pillar 1: our language model.*
>
> *Instead of training a model from scratch, we took RoBERTa—a proven transformer model from Meta—and fine-tuned it on 128,000 verified real and fake news claims from academic datasets like LIAR-PLUS and ISOT.*
>
> *The key feature here is what we call **Attention Saliency Mapping**. When you read an article, VeritasAI does not just say '80% fake'. It highlights the exact phrases that triggered the warning—like 'shocking secret cure' or 'what doctors are hiding from you'. This gives journalists immediate visual proof of sensationalist writing.*
>
> *Also, inside our Superadmin Console, if a verified editor marks a correction, the system can feed that data into a background retraining loop so the model gets smarter over time."*

---

### Slide 5: Pillar 2 — Writing Style & Clickbait Detection (4:30 - 5:30)

> **[CLICK NEXT TO SLIDE 5]**
>
> *"Pillar 2 handles writing style and grammar. This pillar does not use neural networks; it uses rule-based Natural Language Processing with Python libraries Spacy and NLTK. This is important because AI models can sometimes be fooled, but grammar rules cannot.*
>
> *We check three specific things:*
>
> *First: **Vocabulary Variety (Type-Token Ratio).** Automated fake news churn mills and bots repeat the same dramatic buzzwords over and over. Real journalists use a much richer, more diverse vocabulary.*
>
> *Second: **Sentence Structure.** Serious news uses balanced sentence structures with proper clauses. Fake news relies heavily on short, pushy commands like 'Read this now!' or 'Share before it gets deleted!'.*
>
> *Third: **The Clickbait Gap.** We measure the emotional difference between the headline and the body paragraphs. If the headline makes a massive, shocking claim, but the article text underneath is calm or completely different, the system flags it as clickbait."*

---

### Slide 6: Pillar 3 — Fact Checking & The Alien Breakthrough (5:30 - 6:45)

> **[CLICK NEXT TO SLIDE 6]**
>
> *"Pillar 3 was one of our biggest engineering breakthroughs: **Semantic Landmark Binding**.*
>
> *During pre-defense testing, I ran a funny test claim: I typed, 'Aliens are real, a UFO is attacking the White House.'*
>
> *In our first version, the system gave it a 72% credibility score and labeled it mostly factual! That was embarrassing. Why did it happen? Because basic keyword search saw words like 'alien', 'UFO', and 'attack', found a real Wikipedia page titled 'List of reported UFO sightings', and assumed the story was verified because the keywords matched!*
>
> *To fix this permanently, I engineered Semantic Landmark Binding with three rules:*
> *1. **Extract Real Landmarks:** The system identifies key physical landmarks—in this case, 'The White House'.*
> *2. **Enforce Landmark Containment:** The source article must prove the event actually happened at that exact landmark.*
> *3. **Disqualify Catalog & List Pages:** An encyclopedia list of past movies or historical sightings is strictly blocked from verifying a breaking news event.*
>
> *When I ran the exact same alien test with this fix, the score dropped from 72% down to 12%—correctly marked as unverified and fake. This cut false positive matches by over 88%."*

---

### Slide 7: Pillar 4 — Website Reputation & University Trust (6:45 - 7:30)

> **[CLICK NEXT TO SLIDE 7]**
>
> *"Pillar 4 looks at who is publishing the story.*
>
> *We built in a database of over 4,000 news publishers from Media Bias / Fact Check. We know which outlets have a proven track record of factual reporting and which ones are known for conspiracy theories.*
>
> *At the same time, we do two live network checks:*
> *First, **Domain Age via WHOIS.** Disinformation campaigns love creating fresh websites, posting lies, and abandoning them a few days later. If a domain was registered less than 30 days ago, VeritasAI slashes its score.*
> *Second, **SSL Security Certificates.** We make sure the website uses valid cryptographic certificates.*
>
> *And for our university environment, I added **Institutional Trust Routing**. If a request or article comes from an accredited educational domain like `.ac.za` or `.edu`, the system recognizes it as an educational institution and gives it trusted routing."*

---

### Slide 8: Database & MongoDB Setup (7:30 - 8:15)

> **[CLICK NEXT TO SLIDE 8]**
>
> *"On Slide 8 is our database architecture.*
>
> *We chose MongoDB 7.0 with Python's asynchronous Motor driver. MongoDB was the natural choice because news articles, highlighted words, and citation lists are all flexible, semi-structured documents.*
>
> *We have four main collections:*
> *- `users`: Stores user accounts, hashed passwords, and roles like Student, Academic, and Admin.*
> *- `results`: Saves full analysis reports so users can review their past history.*
> *- `audit_logs`: A secure ledger recording every important admin action, like role changes, backups, and user suspensions, with IP addresses and timestamps.*
> *- `verification_otps`: This is where we store one-time 6-digit login and reset codes. We used a native MongoDB feature called a **TTL Index** with `expireAfterSeconds: 0`. That means after 10 minutes, MongoDB automatically deletes expired codes from memory by itself. We do not need any background cleanup scripts."*

---

### Slide 9: Dual Backup & Disaster Recovery (8:15 - 9:15)

> **[CLICK NEXT TO SLIDE 9: POINT TO THE 3 BOXES]**
>
> *"Every production system must have a disaster recovery plan. What happens if the hard drive fails or the server crashes?*
>
> *On Slide 9 is our **Enterprise Dual-Backup Engine**, built following the industry 3-2-1 backup rule.*
>
> *Here is how it protects data:*
> *1. **Automatic Snapshots:** Every 12 hours, a background supervisor dumps all MongoDB collections into a compressed ZIP file with a SHA-256 integrity checksum. It keeps the 5 newest snapshots and automatically deletes older ones so disk space is never wasted.*
> *2. **Dual-Destination Mirroring:** Every backup created is saved to our main backup folder and immediately mirrored to a completely separate secondary directory. If one directory gets damaged, the other is safe.*
> *3. **Browser Upload & Instant Restore:** If an entire server goes down, an admin can log into a new instance, drag and drop a backup ZIP file right into the browser, type 'RESTORE', and the entire database is restored in seconds.*
>
> *We also built an essential safeguard: during restoration, the active Super Admin account is never locked out."*

---

### Slide 10: Security & Password Reset (9:15 - 10:00)

> **[CLICK NEXT TO SLIDE 10]**
>
> *"On Slide 10 is our security and authentication setup.*
>
> *First, we added strict email validation. People often try to register using fake throwaway emails or nonsense addresses like `user@g.com`. Our parser checks the domain format and blocks disposable mail services.*
>
> *Second, we deliver emails using Gmail SMTP over encrypted TLS connections.*
>
> *Third, we built a **Self-Service Forgot Password system**. If a student or lecturer forgets their password, they click 'Forgot password?', enter their email, and receive a 6-digit code. To protect against hackers spamming the system, we enforce a 30-second cooldown timer and a 5-attempt brute-force limit. Once the password is reset, the code is immediately destroyed."*

---

### Slide 11: Real Test Results & Speed (10:00 - 10:45)

> **[CLICK NEXT TO SLIDE 11]**
>
> *"Now let's examine our test results on Slide 11.*
>
> *We tested VeritasAI against standard academic benchmark datasets like ISOT and LIAR-PLUS:*
> *- Simple keyword filters only achieved 64.2% accuracy.*
> *- A standalone RoBERTa AI model achieved 81.8% accuracy.*
> *- Generic ChatGPT prompts achieved 79.4% accuracy, but took 2.4 seconds, which is too slow for real-time browsing.*
> *- **VeritasAI's 4-Pillar Ensemble achieved 93.4% accuracy with an F1 score of 0.928 and an average response time of just 680 milliseconds.**
>
> *In user trials with journalism faculty, over 90% of evaluators preferred our 4-pillar breakdown over a single number because they could see the exact evidence behind the decision."*

---

### Slide 12: Summary & Live Demo Transition (10:45 - 11:30)

> **[CLICK NEXT TO SLIDE 12]**
>
> *"To conclude:*
>
> *VeritasAI proves that you do not have to choose between high accuracy and clear explanations.*
>
> *Through this project, I delivered:*
> *1. A working 4-pillar verification platform that runs in under one second.*
> *2. The Semantic Landmark Binding algorithm that stopped false matches on satire and jokes.*
> *3. An enterprise dual-backup and instant disaster recovery system.*
> *4. Complete security with role-based access, audit logging, and OTP recovery.*
>
> *The entire application is live right now in Docker and ready for testing.*
>
> *Thank you very much for your time. I am now ready for your questions and to show you a live demonstration."*

---

## Examiner Q&A Cheat Sheet (Short, Confident Answers in Plain English)

### Question 1: "Why did you choose MongoDB instead of MySQL or PostgreSQL?"
**Your Plain English Answer:**
> *"We picked MongoDB for three simple reasons:*
> *First, news articles, extracted keywords, and fact-checking citations have varying lengths and structures. In PostgreSQL or MySQL, storing changing lists of words and sources requires complex table joins that slow down write speeds. In MongoDB, an article and all its evidence fit neatly inside one JSON document.*
> *Second, MongoDB has built-in TTL indexes. When we store a 6-digit OTP code, MongoDB deletes it automatically after 10 minutes all on its own—we don't need to write custom cron cleanup jobs.*
> *Third, MongoDB documents map directly into our backup ZIP files, making disaster recovery quick and clean."*

---

### Question 2: "If someone writes fake news using very smart English, will your system get fooled?"
**Your Plain English Answer:**
> *"No, and that is exactly why we use four pillars instead of just one AI model.*
> *If an author uses sophisticated vocabulary to trick Pillar 1's language model, Pillar 2 still checks the writing style and emotional gap between the headline and the text.*
> *More importantly, Pillar 3 cross-checks the actual facts against real-world news wires, and Pillar 4 checks when the website was registered.*
> *A scammer can change their vocabulary, but they cannot fake a 5-year-old domain registration or invent breaking news that never happened on the news wires."*

---

### Question 3: "Tell us about that alien attack bug and how you fixed it."
**Your Plain English Answer:**
> *"Earlier in development, I tested the sentence: 'Aliens are real, a UFO is attacking the White House.'*
> *The old search just looked for keywords, matched a Wikipedia page called 'List of reported UFO sightings', and gave it a 72% high credibility score!*
> *I fixed it by creating Semantic Landmark Binding:*
> *First, the system extracts the physical place—the 'White House'.*
> *Second, it requires the news article to specifically confirm that the attack happened at that landmark.*
> *Third, it blocks encyclopedia lists and catalogs from verifying breaking news events.*
> *When we re-tested it, the score dropped to 12% and correctly flagged the claim as fake."*

---

### Question 4: "How does your backup system protect against real-world data loss?"
**Your Plain English Answer:**
> *"We followed the industry 3-2-1 backup standard: 3 copies of data, across 2 different locations, with 1 offsite capability.*
> *Every 12 hours, the server automatically saves a snapshot to our main backup directory and immediately mirrors a copy to a second directory. It keeps only the latest 5 backups so the hard drive never gets full.*
> *If the whole server is destroyed, an admin can log into a new instance, drag a backup ZIP file right into the browser, type 'RESTORE', and bring the entire database back to life in seconds. And during restoration, the Super Admin account is protected so the admin never gets locked out."*

---

### Question 5: "What makes VeritasAI different from ChatGPT or Google Gemini?"
**Your Plain English Answer:**
> *"ChatGPT and Gemini are general-purpose chatbots. When you ask them if news is real, they often hallucinate sources, and you have no way to verify their internal logic. They also take 2 to 4 seconds to respond.*
> *VeritasAI is purpose-built for credibility: it runs in 680 milliseconds, checks domain registration age and SSL certificates, highlights the exact deceptive words visually, and issues a tamper-evident digital certificate with a cryptographic HMAC hash that can be audited in a court or newsroom."*
