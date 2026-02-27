from datetime import date, timedelta
import random

def populate():
    from apps.tasks.models import Task
    from apps.core.models import ConstructionPhase
    from apps.resources.models import Contractor
    
    phases = list(ConstructionPhase.objects.all().order_by('order'))
    contractors = Contractor.objects.all()
    
    shyam = contractors.filter(role='THEKEDAAR').first()
    saroj = contractors.filter(role='ENGINEER').first()
    hari = contractors.filter(role='MISTRI').first()
    
    # Helper to get phase by order safely
    def get_phase(order):
        for p in phases:
            if p.order == order:
                return p
        return None

    tasks = [
        # Phase 1: Site Preparation & Mobilization
        {'title': 'Boundary Wall Marking', 'desc': 'कम्पाउन्ड वालको सिमाना तोक्ने र इट्टा/चुनाले मार्किङ गर्ने काम।', 'phase': 1, 'assigned': saroj, 'priority': 'CRITICAL', 'status': 'COMPLETED'},
        {'title': 'Site Clearing & Leveling', 'desc': 'निर्माण स्थलको झाडी फाँड्ने र जमिन सम्याउने কাজ (घारी फँडानी)।', 'phase': 1, 'assigned': shyam, 'priority': 'HIGH', 'status': 'COMPLETED'},
        {'title': 'Temporary Shed Construction', 'desc': 'कामदार बस्न र निर्माण सामग्री राख्नको लागि अस्थायी टहरो निर्माण (छाप्रो)।', 'phase': 1, 'assigned': shyam, 'priority': 'HIGH', 'status': 'COMPLETED'},
        {'title': 'Boring / Well for Water', 'desc': 'निर्माण कार्यको लागि आवश्यक पानीको व्यवस्था गर्न बोरिङ वा कुवा खन्ने।', 'phase': 1, 'assigned': saroj, 'priority': 'CRITICAL', 'status': 'COMPLETED'},
        {'title': 'Temporary Electricity Setup', 'desc': 'साइटमा मेसिन चलाउन र बत्ती बाल्न अस्थायी बिजुली जडान गर्ने काम।', 'phase': 1, 'assigned': saroj, 'priority': 'HIGH', 'status': 'COMPLETED'},

        # Phase 2: Excavation & Earthwork
        {'title': 'Layout & Threading', 'desc': 'प्लान अनुसार पिलर र जगको लागि नापो लिई सुता तान्ने काम।', 'phase': 2, 'assigned': saroj, 'priority': 'CRITICAL', 'status': 'COMPLETED'},
        {'title': 'Footing Excavation', 'desc': 'पिलरको जग राख्नको लागि तोकिएको गहिराइमा माटो खन्ने काम (जग खन्ने)।', 'phase': 2, 'assigned': hari, 'priority': 'CRITICAL', 'status': 'COMPLETED'},
        {'title': 'Underground Water Tank Excavation', 'desc': 'भूमिगत पानी ट्याङ्की निर्माणको लागि खाल्डो खन्ने काम।', 'phase': 2, 'assigned': hari, 'priority': 'HIGH', 'status': 'COMPLETED'},
        {'title': 'Septic Tank Excavation', 'desc': 'सेफ्टी ट्याङ्की निर्माणको लागि खाल्डो खन्ने काम।', 'phase': 2, 'assigned': shyam, 'priority': 'MEDIUM', 'status': 'COMPLETED'},

        # Phase 3: Foundation & DPC
        {'title': 'PCC Laying in Footings', 'desc': 'जगको खाल्डोमा बलियो आधार बनाउन पिसिसी (PCC) ढलान गर्ने काम।', 'phase': 3, 'assigned': hari, 'priority': 'CRITICAL', 'status': 'IN_PROGRESS'},
        {'title': 'Rebar for Footing & Starter', 'desc': 'जगको जाली बाँध्ने र पिलरको डन्डी ठड्याउने काम।', 'phase': 3, 'assigned': shyam, 'priority': 'CRITICAL', 'status': 'IN_PROGRESS'},
        {'title': 'Footing Casting (Dhalan)', 'desc': 'पिलरको जगलाई सिमेन्ट, बालुवा र गिटी मिसाएर ढलान गर्ने काम।', 'phase': 3, 'assigned': hari, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'Foundation Wall (Gahro)', 'desc': 'जगदेखि प्लिन्थ (DPC) लेभलसम्म ९ इन्चको इँटाको गाह्रो लगाउने काम।', 'phase': 3, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Plinth Beam Rebar & Casting', 'desc': 'प्लिन्थ बिमको डन्डी बाँध्ने, फर्मा लगाउने र ढलान गर्ने काम।', 'phase': 3, 'assigned': shyam, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'DPC (Damp Proof Course) Laying', 'desc': 'भुइँबाट चिस्यान नआओस् भनेर जगमा डिपिसी (DPC) बिछ्याउने काम।', 'phase': 3, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Backfilling Earth in Foundation', 'desc': 'जग वरपर खाली रहेको ठाउँमा माटो पुर्ने र कम्प्याक्टरले खाँद्ने काम।', 'phase': 3, 'assigned': shyam, 'priority': 'MEDIUM', 'status': 'PENDING'},

        # Phase 4: Superstructure - Ground Floor
        {'title': 'GF Column Rebar Extension', 'desc': 'भुइँतलाको पिलरको डन्डी थप्ने र रिङ (Ties) बाँध्ने काम।', 'phase': 4, 'assigned': shyam, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'GF Column Formwork', 'desc': 'भुइँतलाको पिलर ढलान गर्न फर्माबन्दी (सटरिङ) गर्ने काम।', 'phase': 4, 'assigned': shyam, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'GF Column Casting', 'desc': 'भुइँतलाको पिलर ढलान (कंक्रीटिङ) गर्ने काम।', 'phase': 4, 'assigned': hari, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'GF Brick Masonry', 'desc': 'भुइँतलाको भित्री र बाहिरी पर्खालमा ९ इन्च र ४ इन्चको इँटाको गाह्रो लगाउने काम।', 'phase': 4, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'GF Lintel / Sill Casting', 'desc': 'झ्याल र ढोकाको माथि ओजन थाम्न लिन्टल तथा सिल ब्यान्ड ढलान गर्ने काम।', 'phase': 4, 'assigned': hari, 'priority': 'MEDIUM', 'status': 'PENDING'},
        {'title': 'GF Slab Centering & Formwork', 'desc': 'भुइँतलाको छत ढलानको लागि बाँस, पटेरा वा स्टीलका प्लेटले सेन्टरिङ र सटरिङ गर्ने काम।', 'phase': 4, 'assigned': shyam, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'GF Slab Rebar & Electrical Layout', 'desc': 'छतमा डन्डी बिछ्याउने र पङ्खा/बत्तीको लागि बिजुलीको पाइप राख्ने काम।', 'phase': 4, 'assigned': saroj, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'GF Slab Casting (Roof Dhalan)', 'desc': 'भुइँतलाको छत (स्ल्याब) पूर्ण रूपमा ढलान गर्ने काम।', 'phase': 4, 'assigned': hari, 'priority': 'CRITICAL', 'status': 'PENDING'},

        # Phase 5: Superstructure - First Floor
        {'title': 'FF Column Rebar & Casting', 'desc': 'पहिलो तलाको पिलरको डन्डी बाँध्ने र ढलान गर्ने सम्पूर्ण काम।', 'phase': 5, 'assigned': shyam, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'FF Brick Masonry', 'desc': 'पहिलो तलाको भित्री र बाहिरी पर्खालको गाह्रो लगाउने काम।', 'phase': 5, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'FF Lintel Casting', 'desc': 'पहिलो तलाका झ्याल/ढोकामा लिन्टल ढलान गर्ने काम।', 'phase': 5, 'assigned': hari, 'priority': 'MEDIUM', 'status': 'PENDING'},
        {'title': 'FF Slab Formwork & Rebar', 'desc': 'पहिलो तलाको छतको लागि सटरिङ गर्ने, डन्डी बाँध्ने र पाइप बिछ्याउने काम।', 'phase': 5, 'assigned': saroj, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'FF Slab Casting', 'desc': 'पहिलो तलाको छत (स्ल्याब) ढलान गर्ने काम।', 'phase': 5, 'assigned': hari, 'priority': 'CRITICAL', 'status': 'PENDING'},

        # Phase 6: Top Floor/Staircase
        {'title': 'Staircase Rebar & Casting', 'desc': 'भर्याङको लागि डन्डी बाँध्ने र स्टेप (खड्किलो) ढलान गर्ने।', 'phase': 6, 'assigned': hari, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'Parapet Wall Masonry', 'desc': 'छतको वरिपरि रेलिङको लागि ३-४ फिट अग्लो पर्खाल लगाउने काम।', 'phase': 6, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Water Tank Stand / Truss', 'desc': 'पानी ट्याङ्की राख्नको लागि छतमा स्ट्यान्ड वा ट्रस निर्माण गर्ने काम।', 'phase': 6, 'assigned': shyam, 'priority': 'MEDIUM', 'status': 'PENDING'},

        # Phase 7: Finishing - Plaster
        {'title': 'Internal Ceiling Plaster', 'desc': 'भित्र पट्टि कोठाहरूको छत (सिलिङ) मा प्लास्टर गर्ने काम।', 'phase': 7, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Internal Wall Plaster', 'desc': 'भित्र पट्टि कोठाहरूको पर्खालमा प्लास्टर गर्ने काम।', 'phase': 7, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Exterior Wall Plaster', 'desc': 'घरको बाहिरी भाग (फेस) को पर्खालमा वाटरप्रूफ केमिकल मिसाएर प्लास्टर गर्ने काम।', 'phase': 7, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Curing of Plaster', 'desc': 'प्लास्टर गरिएका भित्ता र छतहरूमा नियमित पानी हालेर (क्युरीङ) बलियो बनाउने काम।', 'phase': 7, 'assigned': shyam, 'priority': 'LOW', 'status': 'PENDING'},

        # Phase 8: Finishing - Flooring
        {'title': 'Floor Leveling & Screeding', 'desc': 'भुइँमा टाइल वा मार्बल राख्नु भन्दा अगाडि सिमेन्ट बालुवाको मसलाले भुइँ सम्याउने काम।', 'phase': 8, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Marble/Tile Laying in Rooms', 'desc': 'कोठाहरूको भुइँमा टाइल, मार्बल वा ग्रनाइट ओछ्याउने काम।', 'phase': 8, 'assigned': shyam, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Bathroom Waterproofing & Tiles', 'desc': 'बाथरुमको भुइँमा पानी नचुहिने (वाटरप्रुफिङ) गर्ने र भित्ता तथा भुइँमा टाइल टाँस्ने काम।', 'phase': 8, 'assigned': saroj, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'Kitchen Platform & Tiles', 'desc': 'किचनको स्ल्याबमा ग्रनाइट हाल्ने र भित्तामा (Dado) टाइल लगाउने काम।', 'phase': 8, 'assigned': saroj, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Staircase Marble & Skirting', 'desc': 'भर्याङका खड्किलाहरूमा मार्बल टाँस्ने र वरिपरि स्कर्टिङ लगाउने काम।', 'phase': 8, 'assigned': hari, 'priority': 'MEDIUM', 'status': 'PENDING'},

        # Phase 9: MEP
        {'title': 'Wall Chipping for Wiring', 'desc': 'बिजुलीको तार लैजान भित्ता काटेर (ग्रुभिङ गरेर) पाइप राख्ने ठाउँ बनाउने काम।', 'phase': 9, 'assigned': shyam, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Electrical Wire Pulling', 'desc': 'पाइपभित्र बिजुलीका विभिन्न साइजका तारहरू तान्ने काम।', 'phase': 9, 'assigned': saroj, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Plumbing Pipe Layout', 'desc': 'तातो-चिसो पानी आउने र फोहोर पानी जाने पाइप जडान गर्ने काम।', 'phase': 9, 'assigned': saroj, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'Switchboard & Socket Fixing', 'desc': 'बत्तीको स्विच, प्लग, सकेड र बोर्डहरू भित्तामा जडान गर्ने काम।', 'phase': 9, 'assigned': saroj, 'priority': 'MEDIUM', 'status': 'PENDING'},
        {'title': 'Sanitary Fittings Setup', 'desc': 'बाथरुममा कमोड, बेसिन, धारा, र सावर जडान गर्ने काम।', 'phase': 9, 'assigned': saroj, 'priority': 'HIGH', 'status': 'PENDING'},

        # Phase 10: Interior & Woodwork
        {'title': 'Chaukath Fixing', 'desc': 'ढोका र झ्यालको चौकोस (फ्रेम) भित्तामा सिमेन्ट वा किला ठोकेर जडान गर्ने काम।', 'phase': 10, 'assigned': shyam, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Wall Putty / Primer', 'desc': 'भित्ता चिल्लो बनाउन पुट्टी लगाउने र प्राइमर (बेस कोट) पोत्ने काम।', 'phase': 10, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'False Ceiling Install', 'desc': 'डिजाइन अनुसार जिप्सम वा पिओपी (POP) को फल्स सिलिङ निर्माण गर्ने काम।', 'phase': 10, 'assigned': saroj, 'priority': 'MEDIUM', 'status': 'PENDING'},
        {'title': 'Door / Window Panels', 'desc': 'झ्याल र ढोकाका पल्लाहरू चौकोसमा कब्जा (Hinges) राखेर जडान गर्ने काम।', 'phase': 10, 'assigned': shyam, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'First Coat Painting', 'desc': 'भित्री भित्ताहरूमा रङ (Paint) को पहिलो पत्र लगाउने काम।', 'phase': 10, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},

        # Phase 11: Exterior & Landscaping
        {'title': 'Main Gate Installation', 'desc': 'फलाम वा स्टिलको मुख्य गेट निर्माण गरी जडान गर्ने काम।', 'phase': 11, 'assigned': saroj, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Boundary Wall Plaster & Paint', 'desc': 'कम्पाउन्ड पर्खालमा प्लास्टर गर्ने र रङ लगाउने काम।', 'phase': 11, 'assigned': hari, 'priority': 'MEDIUM', 'status': 'PENDING'},
        {'title': 'Exterior Painting', 'desc': 'घरको बाहिरी भागमा घामपानीबाट बच्ने (Weather Coat) रङ लगाउने काम।', 'phase': 11, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Paving / Tiles in Parking', 'desc': 'पार्किङ स्थल र कम्पाउन्ड भित्र पेभिङ ब्लक वा बाहिरी टाइल ओछ्याउने काम।', 'phase': 11, 'assigned': shyam, 'priority': 'LOW', 'status': 'PENDING'},

        # Phase 12: Final Handover
        {'title': 'Final Coat Painting / Touchups', 'desc': 'कहिँकतै रङ बिग्रेको वा छुटेको भए अन्तिम टचअप र फाइनल रङरोगन गर्ने काम।', 'phase': 12, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Electrical & Plumbing Testing', 'desc': 'सबै बत्ती बलेको, पानी आएको/चुहिएको र ढल निकास ठीक छ-छैन भनेर परीक्षण (Testing) गर्ने।', 'phase': 12, 'assigned': saroj, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'Deep Cleaning of Site', 'desc': 'सिसा, भित्ता, भुइँका दागहरू मेटाएर घरभरि पूरै सरसफाइ गर्ने काम।', 'phase': 12, 'assigned': shyam, 'priority': 'MEDIUM', 'status': 'PENDING'},
        {'title': 'Handover Documentation & Keys', 'desc': 'घरधनीलाई साँचो बुझाउने र वारेन्टी/गारन्टी कागजातहरू हस्तान्तरण गर्ने काम।', 'phase': 12, 'assigned': saroj, 'priority': 'CRITICAL', 'status': 'PENDING'},
    ]

    count = 0
    updated_count = 0
    for t_data in tasks:
        phase_obj = get_phase(t_data['phase'])
        if phase_obj:
            
            # Start dates logic based on phase progression
            start_offset = (t_data['phase'] - 1) * 30
            if t_data['status'] == 'COMPLETED':
                calc_start = date.today() - timedelta(days=start_offset + 15)
            elif t_data['status'] == 'IN_PROGRESS':
                calc_start = date.today() - timedelta(days=2)
            else:
                calc_start = date.today() + timedelta(days=start_offset)

            # Searching if task exists by title and phase to avoid duplicates from script reruns
            # Note: Previously we inserted titles like 'Boundary Wall Marking (Chau-killa chhutyaune)'
            # We are standardizing titles without Nepali brackets, except where needed, but description has the Nepali context.
            # We'll use get_or_create then UPDATE the missing fields.
            
            task, created = Task.objects.get_or_create(
                title=t_data['title'],
                phase=phase_obj,
                defaults={
                    'description': t_data['desc'],
                    'assigned_to': t_data['assigned'],
                    'priority': t_data['priority'],
                    'status': t_data['status'],
                    'start_date': calc_start
                }
            )
            
            if created:
                count += 1
                print(f"Created task: {task.title}")
            else:
                # Update status of existing ones to match our new script logic
                task.description = t_data['desc']
                if task.status != t_data['status'] or task.assigned_to != t_data['assigned']:
                    task.status = t_data['status']
                    task.assigned_to = t_data['assigned']
                task.save()
                updated_count += 1
    
    print(f"Total tasks processed. Created {count} new tasks. Updated {updated_count} existing tasks.")

if __name__ == '__main__':
    populate()
