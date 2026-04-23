"""
Management command: seed_user_guides
Creates UserGuide + UserGuideStep records for the four features added in
the Phase 4–6 completion work: BoQ Wizard, Sathi Voice Assistant,
Photo Intel / Timelapse Gallery, and Permit Co-pilot Checklist.

Usage:
    python manage.py seed_user_guides
    python manage.py seed_user_guides --reset   # deletes existing before re-seeding
"""
from django.core.management.base import BaseCommand

from apps.core.models import UserGuide, UserGuideStep, UserGuideFAQ


GUIDES = [
    # ── BoQ Wizard ────────────────────────────────────────────────────
    {
        "key": "boq_wizard",
        "type": "modal",
        "icon": "📋",
        "order": 10,
        "title_en": "Bill of Quantities (BoQ) Wizard",
        "title_ne": "बिल अफ क्वान्टिटी (BoQ) विजार्ड",
        "description_en": (
            "Automatically generate a priced Bill of Quantities for your project "
            "based on floor area, storeys, and quality tier. Apply the result "
            "directly to your Budget Categories."
        ),
        "description_ne": (
            "तपाईंको प्रोजेक्टको क्षेत्रफल, तल्ला र गुणस्तरका आधारमा स्वचालित रूपमा "
            "बिल अफ क्वान्टिटी तयार गर्नुहोस् र सिधै बजेट कोटिमा लागू गर्नुहोस्।"
        ),
        "steps": [
            {
                "order": 1,
                "text_en": "Open the Estimator section from the left sidebar and click 'BoQ Wizard'.",
                "text_ne": "बायाँ साइडबारबाट Estimator खण्ड खोल्नुहोस् र 'BoQ Wizard' मा क्लिक गर्नुहोस्।",
                "target_element": "[data-section='estimator']",
                "placement": "right",
            },
            {
                "order": 2,
                "text_en": "Enter your project dimensions: total sq.ft., number of storeys, bedrooms, and quality tier (Economy / Standard / Premium).",
                "text_ne": "प्रोजेक्टको विवरण भर्नुहोस्: कुल वर्गफिट, तल्लाको संख्या, कोठाको संख्या, र गुणस्तर (Economy / Standard / Premium)।",
                "target_element": "#boq-inputs-form",
                "placement": "bottom",
            },
            {
                "order": 3,
                "text_en": "Click 'Generate BoQ'. The system matches your inputs to the best template and calculates material quantities with waste factors.",
                "text_ne": "'Generate BoQ' थिच्नुहोस्। सिस्टमले स्वचालित रूपमा सामग्री, मजदुरी र उपकरणको मात्रा र लागत हिसाब गर्छ।",
                "target_element": "#generate-boq-btn",
                "placement": "top",
            },
            {
                "order": 4,
                "text_en": "Review the generated BoQ. Then click 'Apply to Budget' to push the totals into your Budget Categories automatically.",
                "text_ne": "तयार भएको BoQ हेर्नुहोस्। 'Apply to Budget' थिचेर बजेट कोटिमा स्वचालित रूपमा रकम थप्नुहोस्।",
                "target_element": "#apply-boq-btn",
                "placement": "top",
            },
        ],
        "faqs": [
            {
                "order": 1,
                "question_en": "Can I customise the BoQ template?",
                "question_ne": "के म BoQ टेम्पलेट परिवर्तन गर्न सक्छु?",
                "answer_en": "Yes. Admins can create or edit BoQ templates from the admin panel (/api/v1/estimator/boq-templates/). Each template item has a quantity formula, waste percentage, and rate key.",
                "answer_ne": "हो। प्रशासकले admin panel बाट BoQ टेम्पलेट बनाउन वा परिवर्तन गर्न सक्नुहुन्छ। प्रत्येक आइटममा मात्रा सूत्र, अपव्यय प्रतिशत र दर समावेश छ।",
            },
            {
                "order": 2,
                "question_en": "What happens to existing budget categories when I apply a BoQ?",
                "question_ne": "BoQ लागू गर्दा पुराना बजेट कोटिको के हुन्छ?",
                "answer_en": "Applying a BoQ does an update_or_create — so existing categories are updated, not duplicated. Running it twice is safe.",
                "answer_ne": "BoQ लागू गर्दा update_or_create हुन्छ — अर्थात् पुराना कोटि अपडेट हुन्छन्, नयाँ नबन्ने। दोहोर्‍याउँदा पनि समस्या छैन।",
            },
        ],
    },

    # ── Sathi Voice Assistant ─────────────────────────────────────────
    {
        "key": "sathi_voice",
        "type": "modal",
        "icon": "🎙️",
        "order": 20,
        "title_en": "साथी — Voice Assistant",
        "title_ne": "साथी — आवाज सहायक",
        "description_en": (
            "साथी is your Nepali-language construction assistant. Ask about "
            "stock levels, budget, or the next task — by voice or by typing."
        ),
        "description_ne": (
            "साथी तपाईंको नेपाली भाषाको निर्माण सहायक हो। स्टक, बजेट वा "
            "अर्को काम बारे आवाजमा वा टाइप गरेर सोध्नुहोस्।"
        ),
        "steps": [
            {
                "order": 1,
                "text_en": "Click the blue chat icon (💬) floating at the bottom-right corner of the screen to open साथी.",
                "text_ne": "स्क्रिनको तल-दायाँ कुनामा रहेको नीलो च्याट आइकन (💬) थिचेर साथी खोल्नुहोस्।",
                "target_element": "[aria-label='साथी सहायक']",
                "placement": "left",
            },
            {
                "order": 2,
                "text_en": "Press the microphone button and speak in Nepali. For example: 'सिमेन्ट कति बाँकी?' or 'बजेट कति?'",
                "text_ne": "माइक्रोफोन बटन थिचेर नेपालीमा बोल्नुहोस्। उदाहरण: 'सिमेन्ट कति बाँकी?' वा 'बजेट कति?'",
                "target_element": "#sathi-mic-btn",
                "placement": "top",
            },
            {
                "order": 3,
                "text_en": "If your browser doesn't support voice, type your question and press Enter. साथी understands both Nepali and Romanized Nepali.",
                "text_ne": "ब्राउजरमा आवाज नचले, प्रश्न टाइप गरेर Enter थिच्नुहोस्। साथीले नेपाली र रोमनाइज्ड नेपाली दुवै बुझ्छ।",
                "target_element": "#sathi-text-input",
                "placement": "top",
            },
        ],
        "faqs": [
            {
                "order": 1,
                "question_en": "What commands does साथी understand?",
                "question_ne": "साथीले कुन-कुन आदेश बुझ्छ?",
                "answer_en": (
                    "Stock: 'सिमेन्ट कति बाँकी', 'kati baki'\n"
                    "Budget: 'बजेट कति', 'kati kharcha'\n"
                    "Next step: 'अब के गर्ने', 'what next'\n"
                    "Help: 'मदत', 'sathi'"
                ),
                "answer_ne": (
                    "स्टक: 'सिमेन्ट कति बाँकी', 'kati baki'\n"
                    "बजेट: 'बजेट कति', 'kati kharcha'\n"
                    "अर्को काम: 'अब के गर्ने', 'what next'\n"
                    "सहयोग: 'मदत', 'sathi'"
                ),
            },
            {
                "order": 2,
                "question_en": "Can I add custom phrases for साथी to recognise?",
                "question_ne": "के म साथीका लागि थप शब्द/वाक्यांश थप्न सक्छु?",
                "answer_en": "Yes. Admins can add custom phrases via Settings → साथी Phrases (backed by /api/v1/assistant/phrases/).",
                "answer_ne": "हो। प्रशासकले Settings → साथी Phrases मार्फत थप वाक्यांश थप्न सक्नुहुन्छ।",
            },
        ],
    },

    # ── Photo Intel / Timelapse Gallery ──────────────────────────────
    {
        "key": "timelapse_gallery",
        "type": "modal",
        "icon": "🎬",
        "order": 30,
        "title_en": "Timelapse Gallery & AI Photo Audit",
        "title_ne": "टाइमल्याप्स ग्यालरी र AI फोटो अडिट",
        "description_en": (
            "Upload site photos through Tasks → Media. The AI analyses each "
            "photo against the assigned phase and flags mismatches. Generate "
            "timelapse sequences to document progress visually."
        ),
        "description_ne": (
            "Tasks → Media मार्फत साइट फोटो अपलोड गर्नुहोस्। AI ले प्रत्येक "
            "फोटोलाई तोकिएको phase सँग जाँच गर्छ र गलती भेटेमा सूचना दिन्छ। "
            "प्रगतिको भिडियो बनाउन टाइमल्याप्स सिकेन्स जेनेरेट गर्नुहोस्।"
        ),
        "steps": [
            {
                "order": 1,
                "text_en": "Go to any Task and click the Media tab. Upload one or more site photos. The AI will automatically analyse each upload.",
                "text_ne": "जुनसुकै Task मा गएर Media ट्याब थिच्नुहोस्। एक वा बढी साइट फोटो अपलोड गर्नुहोस् — AI स्वचालित रूपमा विश्लेषण गर्छ।",
                "target_element": "[data-tab='media']",
                "placement": "bottom",
            },
            {
                "order": 2,
                "text_en": "Check the AI Audit Feed (orange panel on the dashboard) for any phase mismatches detected by the AI.",
                "text_ne": "ड्यासबोर्डको AI Audit Feed (सुन्तला रंगको प्यानल) मा AI ले पत्ता लगाएका phase विसङ्गतिहरू जाँच्नुहोस्।",
                "target_element": "[data-widget='mismatch-feed']",
                "placement": "left",
            },
            {
                "order": 3,
                "text_en": "Open Timelapse Gallery from the sidebar. Click 'New Sequence', choose scope (Project / Phase / Floor / Room) and date range, then generate.",
                "text_ne": "साइडबारबाट Timelapse Gallery खोल्नुहोस्। 'New Sequence' थिचेर scope र मिति दायरा छान्नुहोस् र जेनेरेट गर्नुहोस्।",
                "target_element": "[data-section='timelapse']",
                "placement": "right",
            },
        ],
        "faqs": [
            {
                "order": 1,
                "question_en": "How many photos do I need for a good timelapse?",
                "question_ne": "राम्रो टाइमल्याप्सका लागि कति फोटो चाहिन्छ?",
                "answer_en": "At least 10–15 photos spread across the construction period work well. For best results, shoot from the same angle each day.",
                "answer_ne": "कम्तीमा १०-१५ फोटो निर्माण अवधिभर खिच्नुभयो भने राम्रो हुन्छ। सकेसम्म एउटै कोणबाट खिच्नुहोला।",
            },
            {
                "order": 2,
                "question_en": "What does the AI phase mismatch mean?",
                "question_ne": "AI phase mismatch भनेको के हो?",
                "answer_en": "When you upload a photo to a Task, the AI checks what construction phase the photo looks like. If it doesn't match the Task's phase, it flags it for your review.",
                "answer_ne": "Task मा फोटो अपलोड गर्दा AI ले फोटोको निर्माण phase अनुमान गर्छ। यदि Task को phase सँग मेल खाएन भने तपाईंलाई सूचना दिन्छ।",
            },
        ],
    },

    # ── Permit Co-pilot ───────────────────────────────────────────────
    {
        "key": "permit_copilot",
        "type": "modal",
        "icon": "📄",
        "order": 40,
        "title_en": "Permit Co-pilot Checklist",
        "title_ne": "परमिट को-पाइलट चेकलिस्ट",
        "description_en": (
            "The permit co-pilot generates a step-by-step checklist for obtaining "
            "construction permits from your municipality. Tracks which documents "
            "are collected and flags approaching deadlines."
        ),
        "description_ne": (
            "परमिट को-पाइलटले नगरपालिकाबाट निर्माण अनुमति लिनका लागि "
            "चरणबद्ध चेकलिस्ट बनाउँछ। कुन कागजात जम्मा भयो र कुनको म्याद "
            "नजिकिँदैछ भनेर ट्र्याक गर्छ।"
        ),
        "steps": [
            {
                "order": 1,
                "text_en": "Open Permits from the sidebar. Click 'Start Permit Wizard' to begin.",
                "text_ne": "साइडबारबाट Permits खोल्नुहोस् र 'Start Permit Wizard' थिच्नुहोस्।",
                "target_element": "[data-section='permits']",
                "placement": "right",
            },
            {
                "order": 2,
                "text_en": "Select your municipality (e.g., Kathmandu Metropolitan City). The wizard loads the official permit steps for that municipality.",
                "text_ne": "आफ्नो नगरपालिका छान्नुहोस् (जस्तै काठमाडौं महानगरपालिका)। विजार्डले त्यस नगरपालिकाका आधिकारिक परमिट चरणहरू लोड गर्छ।",
                "target_element": "#municipality-select",
                "placement": "bottom",
            },
            {
                "order": 3,
                "text_en": "Click 'Generate Checklist'. Each step shows required documents, responsible party, and deadline. Tick items as you complete them.",
                "text_ne": "'Generate Checklist' थिच्नुहोस्। प्रत्येक चरणमा आवश्यक कागजात, जिम्मेवार व्यक्ति र म्याद देखिन्छ। सकिसकेका काम टिक गर्दै जानुहोस्।",
                "target_element": "#generate-checklist-btn",
                "placement": "top",
            },
            {
                "order": 4,
                "text_en": "The dashboard will highlight overdue checklist items in red. The system automatically refreshes deadline statuses each day.",
                "text_ne": "ड्यासबोर्डले म्याद नाघेका चेकलिस्ट आइटमहरू रातोमा देखाउँछ। म्याद स्थिति प्रतिदिन स्वचालित रूपमा अद्यावधिक हुन्छ।",
                "target_element": "[data-widget='permit-status']",
                "placement": "left",
            },
        ],
        "faqs": [
            {
                "order": 1,
                "question_en": "My municipality isn't in the list. What do I do?",
                "question_ne": "मेरो नगरपालिका सूचीमा छैन। के गर्ने?",
                "answer_en": "Contact your system admin to add a custom Municipality Template via the admin panel (/api/v1/permits/municipality-templates/).",
                "answer_ne": "आफ्नो system admin लाई admin panel मार्फत कस्टम Municipality Template थप्न अनुरोध गर्नुहोस्।",
            },
            {
                "order": 2,
                "question_en": "Can I attach documents to each checklist step?",
                "question_ne": "के म प्रत्येक चेकलिस्ट चरणमा कागजात थप्न सक्छु?",
                "answer_en": "Yes — use the Permits → Documents section to upload scanned files, then attach them to specific steps via the checklist view.",
                "answer_ne": "हो — Permits → Documents मार्फत स्क्यान गरिएका कागजात अपलोड गर्नुहोस् र चेकलिस्ट view मार्फत चरणहरूमा जोड्नुहोस्।",
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Seed UserGuide records for BoQ Wizard, Sathi, Timelapse Gallery, and Permit Co-pilot."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing guides for these keys before re-seeding.",
        )

    def handle(self, *args, **options):
        keys = [g["key"] for g in GUIDES]

        if options["reset"]:
            deleted, _ = UserGuide.objects.filter(key__in=keys).delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted} existing guide(s)."))

        created_count = 0
        updated_count = 0

        for g in GUIDES:
            steps_data = g.pop("steps", [])
            faqs_data = g.pop("faqs", [])

            guide, created = UserGuide.objects.update_or_create(
                key=g["key"],
                defaults=g,
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

            # Steps — clear and recreate to keep ordering clean
            guide.steps.all().delete()
            for step in steps_data:
                UserGuideStep.objects.create(guide=guide, **step)

            # FAQs — clear and recreate
            guide.faqs.all().delete()
            for faq in faqs_data:
                UserGuideFAQ.objects.create(guide=guide, **faq)

            self.stdout.write(
                self.style.SUCCESS(f"  {'Created' if created else 'Updated'}: {guide.key} — {guide.title_en}")
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. {created_count} created, {updated_count} updated."
            )
        )
