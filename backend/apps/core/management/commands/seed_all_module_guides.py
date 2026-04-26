"""
Management command: seed_all_module_guides
Auto-creates UserGuide entries for every app module and key page so the
User Guide wiki shows complete coverage from day one.

Usage:
    python manage.py seed_all_module_guides
    python manage.py seed_all_module_guides --reset   # wipe & re-seed
"""
from django.core.management.base import BaseCommand
from apps.core.models import UserGuide, UserGuideStep, UserGuideFAQ, UserGuideSection


ALL_GUIDES = [

    # ─────────────────────────────────────────────────────────────────────────
    # 1. HOME / DASHBOARD
    # ─────────────────────────────────────────────────────────────────────────
    {
        "key": "home_dashboard", "icon": "🏠", "order": 10, "type": "modal",
        "title_en": "Home Dashboard",
        "title_ne": "गृह ड्यासबोर्ड",
        "description_en": (
            "The Home Dashboard is your command centre. It gives you a real-time "
            "snapshot of your active project — budget health, phase progress, "
            "upcoming tasks, recent activity, and key alerts — all in one view."
        ),
        "description_ne": (
            "गृह ड्यासबोर्ड तपाईंको मुख्य केन्द्र हो। यसमा सक्रिय प्रोजेक्टको "
            "बजेट स्वास्थ्य, चरण प्रगति, आगामी कार्यहरू, र प्रमुख सूचनाहरू "
            "एकैपटक देख्न सकिन्छ।"
        ),
        "steps": [
            {"order": 1, "text_en": "After login you land on the Home Dashboard automatically. Use the sidebar or bottom nav to return here any time.", "text_ne": "लग इन पछि तपाईं स्वचालित रूपमा गृह ड्यासबोर्डमा आउनुहुन्छ। जहाँसुकैबाट फर्कन साइडबार वा तल्लो नेभिगेसन प्रयोग गर्नुहोस्।"},
            {"order": 2, "text_en": "The Budget Ring at the top shows total spent vs. total budget. Click it to jump directly into Finance.", "text_ne": "माथिको बजेट रिङले कुल खर्च र बजेट देखाउँछ। यसमा क्लिक गरेर सिधै Finance मोड्युलमा जान सकिन्छ।"},
            {"order": 3, "text_en": "Phase Progress bars show which construction phases are active, pending, or completed. Click any phase to see its tasks.", "text_ne": "चरण प्रगति बारले कुन निर्माण चरण सक्रिय, बाँकी, वा सम्पन्न छ देखाउँछ। कुनै पनि चरणमा क्लिक गरेर त्यसको कार्यहरू हेर्नुहोस्।"},
            {"order": 4, "text_en": "Use the Project Switcher (top-right) to change the active project if you manage multiple builds.", "text_ne": "एकभन्दा बढी निर्माण व्यवस्थापन गर्नुहुन्छ भने माथि-दायाँको Project Switcher प्रयोग गर्नुहोस्।"},
        ],
        "faqs": [
            {"order": 1, "question_en": "Why is the dashboard empty?", "question_ne": "ड्यासबोर्ड खाली किन छ?", "answer_en": "You need at least one project. Click 'New Project' in the Projects module to get started.", "answer_ne": "कम्तीमा एउटा प्रोजेक्ट चाहिन्छ। Projects मोड्युलमा 'New Project' थिच्नुहोस्।"},
            {"order": 2, "question_en": "How do I change the theme?", "question_ne": "थिम कसरी परिवर्तन गर्ने?", "answer_en": "Click the moon/sun icon in the top navigation bar to toggle between dark and light mode.", "answer_ne": "माथिको नेभिगेसन बारमा चन्द्रमा/सूर्य आइकन थिचेर डार्क र लाइट मोड परिवर्तन गर्न सकिन्छ।"},
        ],
        "sections": [
            {"section_type": "tip", "title_en": "Quick Tip", "content_en": "Pin your most-used pages using the star icon on any module's header — they appear in your Favourites bar on the home screen.", "order": 1},
        ],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # 2. PROJECTS MODULE
    # ─────────────────────────────────────────────────────────────────────────
    {
        "key": "projects_module", "icon": "🗂️", "order": 20, "type": "modal",
        "title_en": "Projects Module",
        "title_ne": "प्रोजेक्ट्स मोड्युल",
        "description_en": (
            "The Projects module is the gateway to everything in HCMS. Create and "
            "manage construction projects, configure project settings, assign team "
            "members with roles, and switch your active project at any time."
        ),
        "description_ne": (
            "Projects मोड्युल HCMS को प्रवेशद्वार हो। यहाँ निर्माण प्रोजेक्टहरू "
            "बनाउनुहोस्, टोली सदस्य तोक्नुहोस्, र जुनसुकै समय सक्रिय प्रोजेक्ट "
            "परिवर्तन गर्नुहोस्।"
        ),
        "steps": [
            {"order": 1, "text_en": "Go to Projects from the sidebar. You'll see the Project Gateway listing all your projects.", "text_ne": "साइडबारबाट Projects मा जानुहोस्। Project Gateway मा सबै प्रोजेक्टहरूको सूची देखिन्छ।"},
            {"order": 2, "text_en": "Click '+ New Project' to create a project. Fill in the name, address, budget, start date, and expected completion.", "text_ne": "'+ New Project' थिचेर प्रोजेक्ट बनाउनुहोस्। नाम, ठेगाना, बजेट, सुरु मिति, र अनुमानित समाप्ति मिति भर्नुहोस्।"},
            {"order": 3, "text_en": "Click on any project card to open it. The Overview tab shows a summary. Use the top tabs to navigate between Overview, Settings, and Team.", "text_ne": "कुनै पनि प्रोजेक्ट कार्डमा क्लिक गरेर खोल्नुहोस्। Overview ट्याबले सारांश देखाउँछ। माथिका ट्याबहरूले Overview, Settings, र Team बीच नेभिगेट गर्छन्।"},
            {"order": 4, "text_en": "Go to the Team tab to invite members. Assign roles: Owner, Manager, Engineer, Supervisor, or Viewer.", "text_ne": "Team ट्याबमा गएर सदस्यहरू थप्नुहोस्। भूमिका तोक्नुहोस्: Owner, Manager, Engineer, Supervisor, वा Viewer।"},
            {"order": 5, "text_en": "Use 'Set as Active' on any project to make it the default project across all modules.", "text_ne": "कुनै पनि प्रोजेक्टमा 'Set as Active' थिचेर सबै मोड्युलहरूमा यसलाई डिफल्ट बनाउनुहोस्।"},
        ],
        "faqs": [
            {"order": 1, "question_en": "Can I archive a project without deleting it?", "question_ne": "प्रोजेक्ट नमेटाई संग्रहित गर्न सकिन्छ?", "answer_en": "Yes — go to Project Settings and set the status to 'Completed' or 'On Hold'. This hides it from the active list but retains all data.", "answer_ne": "हो — Project Settings मा गएर status 'Completed' वा 'On Hold' मा राख्नुहोस्।"},
            {"order": 2, "question_en": "How many projects can I have?", "question_ne": "कति प्रोजेक्टहरू राख्न सकिन्छ?", "answer_en": "There is no hard limit. Performance is best with under 50 active projects.", "answer_ne": "कुनै कठोर सीमा छैन। ५० भन्दा कम सक्रिय प्रोजेक्टमा प्रदर्शन सबैभन्दा राम्रो हुन्छ।"},
        ],
        "sections": [
            {"section_type": "warning", "title_en": "Deleting a Project", "content_en": "Deleting a project permanently removes all its phases, tasks, media, budgets, and team members. This action cannot be undone. Archive instead wherever possible.", "order": 1},
        ],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # 3. FINANCE MODULE
    # ─────────────────────────────────────────────────────────────────────────
    {
        "key": "finance_module", "icon": "💰", "order": 30, "type": "modal",
        "title_en": "Finance Module",
        "title_ne": "वित्त मोड्युल",
        "description_en": (
            "The Finance module handles every rupee flowing through your project. "
            "Track banking accounts, record loans and repayments, manage vendor "
            "bills, run the general ledger, control your budget categories, and "
            "monitor fund transfers — all with full audit history."
        ),
        "description_ne": (
            "Finance मोड्युलले तपाईंको प्रोजेक्टमा बग्ने प्रत्येक रुपैयाँको "
            "हिसाब राख्छ। बैंकिङ खाताहरू, ऋण, विक्रेता बिलहरू, लेजर, बजेट "
            "कोटिहरू, र फन्ड स्थानान्तरण — सबैको पूर्ण अडिट इतिहाससहित।"
        ),
        "steps": [
            {"order": 1, "text_en": "Open Finance from the nav. The Dashboard shows cash balance, total income, total expenses, and pending bills at a glance.", "text_ne": "नेभबाट Finance खोल्नुहोस्। ड्यासबोर्डले नगद मौज्दात, कुल आय, कुल खर्च, र बाँकी बिलहरू एकैपटक देखाउँछ।"},
            {"order": 2, "text_en": "Go to Banking to add bank accounts or cash registers. Each account tracks deposits, withdrawals, and current balance.", "text_ne": "Banking मा गएर बैंक खाता वा नगद रजिस्टर थप्नुहोस्। प्रत्येक खाताले जम्मा, निकासी, र हालको मौज्दात ट्र्याक गर्छ।"},
            {"order": 3, "text_en": "Record vendor bills under Bills. Mark them as Paid to auto-update your cash position.", "text_ne": "Bills अन्तर्गत विक्रेता बिलहरू रेकर्ड गर्नुहोस्। Paid चिह्नित गरेपछि नगद मौज्दात स्वचालित रूपमा अपडेट हुन्छ।"},
            {"order": 4, "text_en": "Use Ledger to run a complete double-entry book of accounts with debit/credit columns and running balance.", "text_ne": "Ledger प्रयोग गरेर डेबिट/क्रेडिट स्तम्भसहित पूर्ण दोहोरो प्रविष्टि खाता चलाउनुहोस्।"},
            {"order": 5, "text_en": "Budget tab lets you set category limits (Foundation, Framing, Electrical…) and track actual spend vs. budget in real time.", "text_ne": "Budget ट्याबले कोटि सीमाहरू (Foundation, Framing, Electrical…) तोक्न र वास्तविक खर्च बनाम बजेट वास्तविक समयमा ट्र्याक गर्न दिन्छ।"},
        ],
        "faqs": [
            {"order": 1, "question_en": "Can I export financial reports to Excel?", "question_ne": "वित्तीय रिपोर्ट Excel मा निर्यात गर्न सकिन्छ?", "answer_en": "Yes — use the Export button on any Finance page (Ledger, Budget, Bills). It downloads a formatted .xlsx file.", "answer_ne": "हो — Finance पृष्ठमा (Ledger, Budget, Bills) Export बटन प्रयोग गर्नुहोस्। ढाँचाबद्ध .xlsx फाइल डाउनलोड हुन्छ।"},
            {"order": 2, "question_en": "What currency does the system use?", "question_ne": "सिस्टमले कुन मुद्रा प्रयोग गर्छ?", "answer_en": "All amounts are in Nepali Rupees (NPR). The system formats numbers with Nepali lakh/crore abbreviations.", "answer_ne": "सबै रकम नेपाली रुपैयाँ (NPR) मा छन्। सिस्टमले नेपाली लाख/करोड संक्षेपण प्रयोग गर्छ।"},
            {"order": 3, "question_en": "How do loan repayments work?", "question_ne": "ऋण भुक्तानी कसरी काम गर्छ?", "answer_en": "Go to Finance → Loans. Add a loan with principal, interest rate, and term. Each repayment recorded reduces the outstanding balance and creates a ledger entry automatically.", "answer_ne": "Finance → Loans मा जानुहोस्। मूलधन, ब्याज दर, र अवधिसहित ऋण थप्नुहोस्। प्रत्येक भुक्तानीले बाँकी मौज्दात घटाउँछ र लेजर प्रविष्टि स्वचालित रूपमा बन्छ।"},
        ],
        "sections": [
            {"section_type": "tip", "title_en": "Use Transfers for Inter-Account Moves", "content_en": "If you move money from your bank account to petty cash, record it as a Transfer (not an expense). This keeps both balances accurate and avoids double-counting.", "order": 1},
            {"section_type": "warning", "title_en": "Never Delete Posted Entries", "content_en": "Deleting a posted ledger transaction will break the running balance for all subsequent entries. Void/reverse the entry instead.", "order": 2},
        ],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # 4. RESOURCE MODULE
    # ─────────────────────────────────────────────────────────────────────────
    {
        "key": "resource_module", "icon": "🧱", "order": 40, "type": "modal",
        "title_en": "Resource Module",
        "title_ne": "स्रोत मोड्युल",
        "description_en": (
            "The Resource module manages everything you buy and everyone you hire. "
            "Track materials with real-time stock, record equipment usage, manage "
            "labor contracts and attendance, maintain a supplier directory, and "
            "create purchase orders — with wastage alerts built in."
        ),
        "description_ne": (
            "Resource मोड्युलले खरिद गरिएका सामग्रीहरू र काममा लगाइएका "
            "सबैको व्यवस्थापन गर्छ। वास्तविक समय स्टक, उपकरण प्रयोग, "
            "श्रम अनुबंध, आपूर्तिकर्ता निर्देशिका, र खरिद आदेशहरू — "
            "अपव्यय सतर्कतासहित।"
        ),
        "steps": [
            {"order": 1, "text_en": "Open Resource → Materials. Add items like 'Cement 43 Grade' with unit (bags), unit rate, and minimum stock threshold.", "text_ne": "Resource → Materials खोल्नुहोस्। 'Cement 43 Grade' जस्ता वस्तुहरू एकाइ (बोरा), एकाइ दर, र न्यूनतम स्टक सीमासहित थप्नुहोस्।"},
            {"order": 2, "text_en": "Record transactions (IN/OUT) to update stock in real time. The system shows a warning when stock falls below the minimum.", "text_ne": "स्टक वास्तविक समयमा अपडेट गर्न लेनदेन (IN/OUT) रेकर्ड गर्नुहोस्। स्टक न्यूनतमभन्दा कम भएमा सिस्टमले सतर्कता देखाउँछ।"},
            {"order": 3, "text_en": "Go to Labor to add contractors or workers. Record daily attendance and link payments to Finance automatically.", "text_ne": "Labor मा गएर ठेकेदार वा कामदारहरू थप्नुहोस्। दैनिक उपस्थिति रेकर्ड गर्नुहोस् र भुक्तानीलाई Finance सँग स्वचालित रूपमा जोड्नुहोस्।"},
            {"order": 4, "text_en": "Open Purchases to create Purchase Orders. Once received, the stock count updates automatically.", "text_ne": "Purchases खोलेर खरिद आदेशहरू बनाउनुहोस्। प्राप्त भएपछि स्टक गणना स्वचालित रूपमा अपडेट हुन्छ।"},
        ],
        "faqs": [
            {"order": 1, "question_en": "How do I set up wastage alerts?", "question_ne": "अपव्यय सतर्कता कसरी सेटअप गर्ने?", "answer_en": "In Materials, each item has a 'Wastage Threshold %'. When actual wastage exceeds this percentage (calculated from IN vs. usage), an alert appears on the dashboard.", "answer_ne": "Materials मा प्रत्येक वस्तुमा 'Wastage Threshold %' छ। वास्तविक अपव्यय यो प्रतिशतभन्दा बढी भएमा ड्यासबोर्डमा सतर्कता देखिन्छ।"},
            {"order": 2, "question_en": "Can I import materials from a CSV file?", "question_ne": "CSV फाइलबाट सामग्रीहरू आयात गर्न सकिन्छ?", "answer_en": "Yes — use Data Import (from the nav) to upload a CSV. Download the template from the Import page first.", "answer_ne": "हो — नेभबाट Data Import प्रयोग गर्नुहोस्। पहिले Import पृष्ठबाट टेम्पलेट डाउनलोड गर्नुहोस्।"},
        ],
        "sections": [
            {"section_type": "tip", "title_en": "Link Suppliers to Materials", "content_en": "When adding a material, link it to a Supplier. This auto-fills the supplier on Purchase Orders and makes reordering one click away.", "order": 1},
        ],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # 5. STRUCTURE MODULE
    # ─────────────────────────────────────────────────────────────────────────
    {
        "key": "structure_module", "icon": "🏛️", "order": 50, "type": "modal",
        "title_en": "Structure Module",
        "title_ne": "संरचना मोड्युल",
        "description_en": (
            "The Structure module lets you model your building digitally. Define "
            "floors, map rooms onto an interactive floor plan, set MEP schedules, "
            "track room-level completion, and maintain a visual progress overview "
            "of the entire structure."
        ),
        "description_ne": (
            "Structure मोड्युलले तपाईंको भवन डिजिटल रूपमा मोडेल गर्न दिन्छ। "
            "तल्लाहरू परिभाषित गर्नुहोस्, अन्तरक्रियात्मक फ्लोर प्लानमा "
            "कोठाहरू म्याप गर्नुहोस्, MEP तालिका तोक्नुहोस्, र कोठा-स्तरको "
            "सम्पन्नता ट्र्याक गर्नुहोस्।"
        ),
        "steps": [
            {"order": 1, "text_en": "Open Structure → Overview. You'll see all defined floors and their completion percentage.", "text_ne": "Structure → Overview खोल्नुहोस्। सबै परिभाषित तल्लाहरू र तिनीहरूको सम्पन्नता प्रतिशत देखिन्छ।"},
            {"order": 2, "text_en": "Click 'Add Floor' to create a floor (Ground Floor, 1st Floor, Roof, etc.). Set its elevation and area.", "text_ne": "'Add Floor' थिचेर तल्ला बनाउनुहोस् (Ground Floor, 1st Floor, Roof, आदि)। उचाइ र क्षेत्रफल तोक्नुहोस्।"},
            {"order": 3, "text_en": "Go to Floor Plan tab on a floor to open the interactive canvas. Draw rooms by clicking and dragging. Label each room (Bedroom, Kitchen, Bathroom, etc.).", "text_ne": "कुनै तल्लामा Floor Plan ट्याबमा गएर अन्तरक्रियात्मक क्यानभस खोल्नुहोस्। क्लिक गरेर तानेर कोठाहरू कोर्नुहोस्।"},
            {"order": 4, "text_en": "Click on a room to set its budget allocation, MEP details, and completion status.", "text_ne": "कोठामा क्लिक गरेर बजेट विनियोजन, MEP विवरण, र सम्पन्नता स्थिति तोक्नुहोस्।"},
            {"order": 5, "text_en": "The Progress tab shows a colour-coded heat-map of the building — green for complete rooms, amber for in-progress, red for not started.", "text_ne": "Progress ट्याबले भवनको रङ-कोडेड हिट म्याप देखाउँछ — हरियो सम्पन्न, पहेँलो चलिरहेको, रातो सुरु नभएको।"},
        ],
        "faqs": [
            {"order": 1, "question_en": "Can I upload a real floor plan image as background?", "question_ne": "वास्तविक फ्लोर प्लान छवि पृष्ठभूमिको रूपमा अपलोड गर्न सकिन्छ?", "answer_en": "Yes — on the Floor Plan canvas, click 'Upload Background' to place your architectural drawing behind the room polygons.", "answer_ne": "हो — Floor Plan क्यानभसमा 'Upload Background' थिचेर आफ्नो वास्तुकला रेखाचित्र कोठा पोलिगनपछाडि राख्नुहोस्।"},
            {"order": 2, "question_en": "What does MEP stand for?", "question_ne": "MEP भनेको के हो?", "answer_en": "Mechanical, Electrical, and Plumbing. Each room's MEP schedule tracks which services are installed and their inspection status.", "answer_ne": "Mechanical, Electrical, र Plumbing। प्रत्येक कोठाको MEP तालिकाले कुन सेवाहरू स्थापित भए र तिनीहरूको निरीक्षण स्थिति ट्र्याक गर्छ।"},
        ],
        "sections": [
            {"section_type": "note", "title_en": "Room Budgets vs Project Budget", "content_en": "Room budget allocations are informational targets — they don't automatically link to Finance transactions. Use the Finance module to record actual expenditure.", "order": 1},
        ],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # 6. TIMELINE MODULE
    # ─────────────────────────────────────────────────────────────────────────
    {
        "key": "timeline_module", "icon": "📅", "order": 60, "type": "modal",
        "title_en": "Timeline Module",
        "title_ne": "समयरेखा मोड्युल",
        "description_en": (
            "The Timeline module is your project scheduler. View tasks in Gantt, "
            "Kanban, Calendar, or List views. Assign owners, set dependencies, "
            "track deadlines, log updates, and attach photos — with automatic "
            "critical-path detection."
        ),
        "description_ne": (
            "Timeline मोड्युल तपाईंको प्रोजेक्ट सूचक हो। Gantt, Kanban, "
            "Calendar, वा List दृश्यमा कार्यहरू हेर्नुहोस्। जिम्मेवारी तोक्नुहोस्, "
            "निर्भरता तोक्नुहोस्, म्याद ट्र्याक गर्नुहोस्, र स्वचालित "
            "क्रिटिकल-पाथ पत्ता लगाउनुहोस्।"
        ),
        "steps": [
            {"order": 1, "text_en": "Open Timeline. Choose your preferred view — Gantt (bar chart), Kanban (drag-and-drop boards), Calendar, or List.", "text_ne": "Timeline खोल्नुहोस्। आफ्नो मनपर्ने दृश्य छान्नुहोस् — Gantt (बार चार्ट), Kanban (ड्र्याग-एन्ड-ड्रप बोर्ड), Calendar, वा List।"},
            {"order": 2, "text_en": "Click '+ New Task' to create a task. Set its phase, assignee, start date, due date, and priority.", "text_ne": "'+ New Task' थिचेर कार्य बनाउनुहोस्। चरण, जिम्मेवार व्यक्ति, सुरु मिति, समाप्ति मिति, र प्राथमिकता तोक्नुहोस्।"},
            {"order": 3, "text_en": "On the Gantt view, drag task bars to reschedule. Draw dependency arrows by hovering the right edge of a bar and dragging to another task.", "text_ne": "Gantt दृश्यमा, पुनः तालिका बनाउन कार्य बारहरू तान्नुहोस्। निर्भरता तीर खिच्न बारको दायाँ किनारमा होभर गरेर अर्को कार्यमा तान्नुहोस्।"},
            {"order": 4, "text_en": "Click any task to open its drawer — log progress updates, attach media, and comment. Critical-path tasks are highlighted in red.", "text_ne": "कुनै पनि कार्यमा क्लिक गरेर drawer खोल्नुहोस् — प्रगति अपडेट लग गर्नुहोस्, मिडिया जोड्नुहोस्, र टिप्पणी गर्नुहोस्। क्रिटिकल-पाथ कार्यहरू रातोमा हाइलाइट हुन्छन्।"},
        ],
        "faqs": [
            {"order": 1, "question_en": "What is a critical path?", "question_ne": "क्रिटिकल पाथ भनेको के हो?", "answer_en": "The critical path is the longest chain of dependent tasks. Any delay in a critical-path task delays the whole project. HCMS calculates it automatically from your task dependencies.", "answer_ne": "क्रिटिकल पाथ निर्भर कार्यहरूको सबैभन्दा लामो श्रृंखला हो। क्रिटिकल-पाथ कार्यमा ढिलाइ भएमा सम्पूर्ण प्रोजेक्ट ढिलो हुन्छ।"},
            {"order": 2, "question_en": "Can I view tasks from multiple phases at once?", "question_ne": "एकैपटक धेरै चरणका कार्यहरू हेर्न सकिन्छ?", "answer_en": "Yes — in List and Gantt views, use the Phase filter dropdown to select All Phases. Each phase gets its own colour band.", "answer_ne": "हो — List र Gantt दृश्यमा Phase filter dropdown प्रयोग गरेर All Phases छान्नुहोस्। प्रत्येक चरणको आफ्नै रङ ब्यान्ड हुन्छ।"},
        ],
        "sections": [
            {"section_type": "trick", "title_en": "Bulk Status Update", "content_en": "In Kanban view, drag multiple cards at once by holding Shift and clicking. Drop them all into a new status column to bulk-update.", "order": 1},
        ],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # 7. ACCOUNTS MODULE
    # ─────────────────────────────────────────────────────────────────────────
    {
        "key": "accounts_module", "icon": "👤", "order": 70, "type": "modal",
        "title_en": "Accounts & User Management",
        "title_ne": "खाता र प्रयोगकर्ता व्यवस्थापन",
        "description_en": (
            "The Accounts module controls who can access HCMS and what they can do. "
            "System admins manage users, assign roles, view activity logs, and "
            "control system-level settings. Regular users manage their own profile "
            "and password."
        ),
        "description_ne": (
            "Accounts मोड्युलले HCMS मा कसले पहुँच गर्न सक्छ र के गर्न सक्छ "
            "नियन्त्रण गर्छ। System admin ले प्रयोगकर्ताहरू व्यवस्थापन गर्छन्, "
            "भूमिकाहरू तोक्छन्, र गतिविधि लगहरू हेर्छन्।"
        ),
        "steps": [
            {"order": 1, "text_en": "Open Accounts from the nav. Your profile page appears first — update your name, profile photo, and language preference here.", "text_ne": "नेभबाट Accounts खोल्नुहोस्। पहिले तपाईंको प्रोफाइल पृष्ठ देखिन्छ — यहाँ नाम, प्रोफाइल फोटो, र भाषा प्राथमिकता अपडेट गर्नुहोस्।"},
            {"order": 2, "text_en": "(Admin only) Go to Users tab to view all registered users. Use 'Invite User' to send an email invitation. Users are inactive until they complete registration.", "text_ne": "(केवल Admin) Users ट्याबमा गएर सबै दर्ता प्रयोगकर्ताहरू हेर्नुहोस्। 'Invite User' प्रयोग गरेर इमेल आमन्त्रण पठाउनुहोस्।"},
            {"order": 3, "text_en": "(Admin only) Go to Roles to create custom permission sets. Assign roles to users for fine-grained access control.", "text_ne": "(केवल Admin) Roles मा गएर कस्टम अनुमति सेटहरू बनाउनुहोस्। प्रयोगकर्ताहरूलाई विस्तृत पहुँच नियन्त्रणका लागि भूमिकाहरू तोक्नुहोस्।"},
            {"order": 4, "text_en": "(Admin only) Activity Logs shows every login, data change, and deletion — with user, timestamp, and IP address.", "text_ne": "(केवल Admin) Activity Logs मा प्रत्येक लगइन, डेटा परिवर्तन, र मेटाइएको — प्रयोगकर्ता, समय, र IP ठेगानासहित देखिन्छ।"},
        ],
        "faqs": [
            {"order": 1, "question_en": "How do I reset another user's password?", "question_ne": "अर्को प्रयोगकर्ताको पासवर्ड कसरी रिसेट गर्ने?", "answer_en": "Go to Accounts → Users, click on the user, then click 'Reset Password'. The user receives an email with a reset link.", "answer_ne": "Accounts → Users मा गएर प्रयोगकर्तामा क्लिक गर्नुहोस्, त्यसपछि 'Reset Password' थिच्नुहोस्।"},
            {"order": 2, "question_en": "What is the difference between a System Admin and a project Owner?", "question_ne": "System Admin र project Owner बीच के फरक छ?", "answer_en": "System Admin controls the whole HCMS installation (users, roles, system settings). Project Owner controls a specific project (team, settings, budget). A user can be both.", "answer_ne": "System Admin ले सम्पूर्ण HCMS स्थापना नियन्त्रण गर्छ। Project Owner ले एक विशेष प्रोजेक्ट नियन्त्रण गर्छ।"},
        ],
        "sections": [
            {"section_type": "warning", "title_en": "Never Deactivate the Last Admin", "content_en": "Deactivating the only system admin account will lock everyone out of admin functions. Always have at least two admin accounts.", "order": 1},
        ],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # 8. ANALYTICS
    # ─────────────────────────────────────────────────────────────────────────
    {
        "key": "analytics_page", "icon": "📈", "order": 80, "type": "modal",
        "title_en": "Analytics & Reports",
        "title_ne": "विश्लेषण र रिपोर्टहरू",
        "description_en": (
            "Analytics aggregates data across your project and presents it as "
            "interactive charts — budget burn, task completion rate, material "
            "consumption trends, labor cost over time, and phase velocity."
        ),
        "description_ne": (
            "Analytics ले तपाईंको प्रोजेक्टको डेटा एकत्रित गरी अन्तरक्रियात्मक "
            "चार्टहरूमा प्रस्तुत गर्छ — बजेट बर्न, कार्य सम्पन्नता दर, "
            "सामग्री खपत प्रवृत्ति, र श्रम लागत।"
        ),
        "steps": [
            {"order": 1, "text_en": "Open Analytics. Select a date range from the top bar to filter all charts.", "text_ne": "Analytics खोल्नुहोस्। सबै चार्टहरू फिल्टर गर्न माथिको बारबाट मिति दायरा छान्नुहोस्।"},
            {"order": 2, "text_en": "Hover over any chart data point to see the exact values in a tooltip.", "text_ne": "कुनै पनि चार्ट डेटा बिन्दुमा होभर गरेर tooltip मा सटीक मानहरू हेर्नुहोस्।"},
            {"order": 3, "text_en": "Click 'Export PDF' or 'Export Excel' to download a full report for sharing with stakeholders.", "text_ne": "सरोकारवालाहरूसँग साझा गर्न पूर्ण रिपोर्ट डाउनलोड गर्न 'Export PDF' वा 'Export Excel' थिच्नुहोस्।"},
        ],
        "faqs": [
            {"order": 1, "question_en": "How often is analytics data refreshed?", "question_ne": "Analytics डेटा कति पटक ताज़ा हुन्छ?", "answer_en": "Charts update in real-time as transactions and tasks are recorded. There is no delay.", "answer_ne": "लेनदेन र कार्यहरू रेकर्ड हुने बित्तिकै चार्टहरू वास्तविक समयमा अपडेट हुन्छन्।"},
        ],
        "sections": [],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # 9. ESTIMATOR / BOQ
    # ─────────────────────────────────────────────────────────────────────────
    {
        "key": "estimator_page", "icon": "🧮", "order": 90, "type": "modal",
        "title_en": "Estimator & BoQ Wizard",
        "title_ne": "एस्टिमेटर र BoQ विजार्ड",
        "description_en": (
            "The Estimator generates a Bill of Quantities (BoQ) from your project "
            "dimensions. Enter floor area, storeys, and quality tier — the wizard "
            "calculates material quantities, labour costs, and total estimates, "
            "then pushes them straight into your budget categories."
        ),
        "description_ne": (
            "Estimator ले तपाईंको प्रोजेक्ट मापहरूबाट Bill of Quantities (BoQ) "
            "उत्पन्न गर्छ। क्षेत्रफल, तल्ला, र गुणस्तर स्तर प्रविष्ट गर्नुहोस् — "
            "विजार्डले सामग्री मात्रा, श्रम लागत, र कुल अनुमान हिसाब गरेर "
            "बजेट कोटिमा सिधै पठाउँछ।"
        ),
        "steps": [
            {"order": 1, "text_en": "Open Estimator. Enter your project's total built-up area (sq.ft.), number of storeys, and quality level (Economy / Standard / Premium).", "text_ne": "Estimator खोल्नुहोस्। प्रोजेक्टको कुल निर्मित क्षेत्रफल (वर्गफिट), तल्लाको संख्या, र गुणस्तर (Economy / Standard / Premium) प्रविष्ट गर्नुहोस्।"},
            {"order": 2, "text_en": "Click 'Generate BoQ'. Review the generated line items — materials, labour, equipment — with quantities and rates.", "text_ne": "'Generate BoQ' थिच्नुहोस्। उत्पन्न लाइन आइटमहरू — सामग्री, श्रम, उपकरण — मात्रा र दरसहित समीक्षा गर्नुहोस्।"},
            {"order": 3, "text_en": "Adjust individual quantities or rates if needed, then click 'Apply to Budget' to push totals into Finance → Budget.", "text_ne": "आवश्यक भए व्यक्तिगत मात्रा वा दरहरू समायोजन गर्नुहोस्, त्यसपछि Finance → Budget मा कुल पठाउन 'Apply to Budget' थिच्नुहोस्।"},
        ],
        "faqs": [
            {"order": 1, "question_en": "Where do the material rates come from?", "question_ne": "सामग्री दरहरू कहाँबाट आउँछन्?", "answer_en": "Rates are pulled from your Resource → Materials catalogue. Keep your material rates updated there for accurate estimates.", "answer_ne": "दरहरू तपाईंको Resource → Materials सूचीबाट लिइन्छन्। सटीक अनुमानका लागि त्यहाँ सामग्री दरहरू अद्यावधिक राख्नुहोस्।"},
        ],
        "sections": [],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # 10. PERMITS
    # ─────────────────────────────────────────────────────────────────────────
    {
        "key": "permits_page", "icon": "📜", "order": 100, "type": "modal",
        "title_en": "Permit Co-pilot",
        "title_ne": "परमिट को-पाइलट",
        "description_en": (
            "The Permit Co-pilot generates a municipality-specific checklist for "
            "obtaining your construction permit (Naksha Paas). Track document "
            "collection, flag deadlines, and attach scanned files to each step."
        ),
        "description_ne": (
            "Permit Co-pilot ले नगरपालिका-विशेष निर्माण अनुमति (नक्सा पास) "
            "प्राप्त गर्नका लागि चेकलिस्ट उत्पन्न गर्छ। कागजात संकलन ट्र्याक "
            "गर्नुहोस्, म्याद चिह्नित गर्नुहोस्, र प्रत्येक चरणमा स्क्यान "
            "फाइलहरू जोड्नुहोस्।"
        ),
        "steps": [
            {"order": 1, "text_en": "Open Permits and click 'Start Permit Wizard'. Select your municipality.", "text_ne": "Permits खोलेर 'Start Permit Wizard' थिच्नुहोस्। आफ्नो नगरपालिका छान्नुहोस्।"},
            {"order": 2, "text_en": "Click 'Generate Checklist'. Each step shows the required documents, responsible office, and deadline.", "text_ne": "'Generate Checklist' थिच्नुहोस्। प्रत्येक चरणमा आवश्यक कागजात, जिम्मेवार कार्यालय, र म्याद देखिन्छ।"},
            {"order": 3, "text_en": "Tick each step as you complete it. Attach scanned copies of submitted documents.", "text_ne": "पूरा हुँदै जाँदा प्रत्येक चरण टिक गर्नुहोस्। पेश गरिएका कागजातको स्क्यान प्रतिलिपि जोड्नुहोस्।"},
        ],
        "faqs": [
            {"order": 1, "question_en": "My municipality isn't listed. What do I do?", "question_ne": "मेरो नगरपालिका सूचीमा छैन, के गर्ने?", "answer_en": "Ask your system admin to add a Municipality Template in the admin panel.", "answer_ne": "आफ्नो system admin लाई admin panel मा Municipality Template थप्न अनुरोध गर्नुहोस्।"},
        ],
        "sections": [],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # 11. PHOTOS & TIMELAPSE
    # ─────────────────────────────────────────────────────────────────────────
    {
        "key": "photos_timelapse", "icon": "📸", "order": 110, "type": "modal",
        "title_en": "Photos & Timelapse Gallery",
        "title_ne": "फोटो र टाइमल्याप्स ग्यालरी",
        "description_en": (
            "Upload site photos tagged to phases and tasks. The AI audit engine "
            "cross-checks each photo against its assigned phase and flags visual "
            "mismatches. Generate timelapse sequences to document and share "
            "project progress."
        ),
        "description_ne": (
            "चरण र कार्यमा ट्याग गरिएका साइट फोटोहरू अपलोड गर्नुहोस्। AI "
            "अडिट इन्जिनले प्रत्येक फोटोलाई तोकिएको चरणसँग जाँच गर्छ र "
            "दृश्य विसङ्गतिहरू चिह्नित गर्छ। प्रगति कागजात गर्न र साझा गर्न "
            "टाइमल्याप्स सिकेन्सहरू उत्पन्न गर्नुहोस्।"
        ),
        "steps": [
            {"order": 1, "text_en": "Open Photos. Click 'Upload Photos' to add site images. Tag each with a phase and optionally a task.", "text_ne": "Photos खोल्नुहोस्। 'Upload Photos' थिचेर साइट छविहरू थप्नुहोस्। प्रत्येकलाई चरण र वैकल्पिक रूपमा कार्यसँग ट्याग गर्नुहोस्।"},
            {"order": 2, "text_en": "The AI will automatically analyse uploaded photos and surface any phase mismatches in the Audit Feed.", "text_ne": "AI ले स्वचालित रूपमा अपलोड गरिएका फोटोहरू विश्लेषण गरेर Audit Feed मा कुनै पनि phase विसङ्गतिहरू देखाउँछ।"},
            {"order": 3, "text_en": "Open Timelapse. Click 'New Sequence', set the scope (project/phase/room), date range, and frame rate. Hit Generate.", "text_ne": "Timelapse खोल्नुहोस्। 'New Sequence' थिच्नुहोस्, scope (project/phase/room), मिति दायरा, र frame rate तोक्नुहोस्। Generate थिच्नुहोस्।"},
        ],
        "faqs": [
            {"order": 1, "question_en": "What file types are supported for photo uploads?", "question_ne": "फोटो अपलोडका लागि कुन फाइल प्रकारहरू समर्थित छन्?", "answer_en": "JPEG, PNG, WEBP, and HEIC. Maximum 20MB per file. For best AI analysis quality, use photos of at least 1MB.", "answer_ne": "JPEG, PNG, WEBP, र HEIC। प्रत्येक फाइल अधिकतम 20MB। सर्वोत्तम AI विश्लेषण गुणस्तरका लागि कम्तीमा 1MB को फोटो प्रयोग गर्नुहोस्।"},
        ],
        "sections": [
            {"section_type": "tip", "title_en": "Shoot from the Same Angle", "content_en": "For the best timelapse effect, photograph your site from the same position, height, and orientation each day. Use a tripod or mark the spot on the ground.", "order": 1},
        ],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # 12. DATA IMPORT
    # ─────────────────────────────────────────────────────────────────────────
    {
        "key": "data_import", "icon": "📥", "order": 120, "type": "modal",
        "title_en": "Data Import",
        "title_ne": "डेटा आयात",
        "description_en": (
            "Import bulk data from CSV or Excel files. Templates are available "
            "for Materials, Contractors, Phases, Tasks, and Transactions. Use "
            "this to migrate existing records from spreadsheets into HCMS."
        ),
        "description_ne": (
            "CSV वा Excel फाइलहरूबाट बल्क डेटा आयात गर्नुहोस्। सामग्री, "
            "ठेकेदार, चरण, कार्य, र लेनदेनका लागि टेम्पलेटहरू उपलब्ध छन्।"
        ),
        "steps": [
            {"order": 1, "text_en": "Open Data Import. Download the template file for the data type you want to import.", "text_ne": "Data Import खोल्नुहोस्। आयात गर्न चाहनुभएको डेटा प्रकारको टेम्पलेट फाइल डाउनलोड गर्नुहोस्।"},
            {"order": 2, "text_en": "Fill the template with your data. Do not change the column headers.", "text_ne": "टेम्पलेट आफ्नो डेटाले भर्नुहोस्। स्तम्भ हेडरहरू परिवर्तन नगर्नुहोस्।"},
            {"order": 3, "text_en": "Upload the completed file and click 'Import'. Errors are shown row by row — fix them and re-upload.", "text_ne": "पूरा भएको फाइल अपलोड गरेर 'Import' थिच्नुहोस्। त्रुटिहरू पङ्क्ति-दर-पङ्क्ति देखिन्छन् — तिनीहरू सुधारेर पुनः अपलोड गर्नुहोस्।"},
        ],
        "faqs": [
            {"order": 1, "question_en": "Will importing overwrite existing records?", "question_ne": "आयात गर्दा अवस्थित रेकर्डहरू अधिलेखन हुन्छन्?", "answer_en": "Only if the row has a matching ID column. Rows without IDs are treated as new records and inserted.", "answer_ne": "केवल पङ्क्तिमा मिल्ने ID स्तम्भ भएमा। ID नभएका पङ्क्तिहरू नयाँ रेकर्डको रूपमा थपिन्छन्।"},
        ],
        "sections": [],
    },
]


class Command(BaseCommand):
    help = "Seed UserGuide entries for all app modules and pages."

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset', action='store_true',
            help='Delete existing guides for these keys before re-seeding.',
        )

    def handle(self, *args, **options):
        keys = [g['key'] for g in ALL_GUIDES]

        if options['reset']:
            deleted, _ = UserGuide.objects.filter(key__in=keys).delete()
            self.stdout.write(self.style.WARNING(f'Deleted {deleted} existing guide(s).'))

        created_count = updated_count = 0

        for g in ALL_GUIDES:
            steps_data    = g.pop('steps',    [])
            faqs_data     = g.pop('faqs',     [])
            sections_data = g.pop('sections', [])

            guide, created = UserGuide.objects.update_or_create(
                key=g['key'], defaults=g,
            )
            if created: created_count += 1
            else:       updated_count += 1

            # Steps — replace (keep order clean)
            guide.steps.all().delete()
            for step in steps_data:
                UserGuideStep.objects.create(guide=guide, **step)

            # FAQs — replace
            guide.faqs.all().delete()
            for faq in faqs_data:
                UserGuideFAQ.objects.create(guide=guide, **faq)

            # Sections — replace only if reset; otherwise preserve user contributions
            if options['reset']:
                guide.sections.all().delete()
            for sec in sections_data:
                # insert seeded sections only if they don't already exist by title
                if not guide.sections.filter(title_en=sec['title_en']).exists():
                    UserGuideSection.objects.create(guide=guide, **sec)

            label = 'Created' if created else 'Updated'
            self.stdout.write(self.style.SUCCESS(f'  {label}: {guide.key} — {guide.title_en}'))

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. {created_count} created, {updated_count} updated.'
        ))
