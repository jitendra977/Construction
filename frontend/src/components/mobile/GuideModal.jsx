import React, { useState } from 'react';
import Modal from '../common/Modal';

const GuideModal = ({ isOpen, onClose }) => {
    const [expandedSection, setExpandedSection] = useState(0);

    const guideSections = [
        {
            title: "१. घरको बनावट (Structure) 🏗️",
            description: "प्रोजेक्टका चरण, तल्ला र कोठाहरू",
            icon: "🏗️",
            details: [
                {
                    head: "निर्माण चरण (Phase):",
                    definition: "यो भनेको के हो? - निर्माण कार्यको एक मुख्य भाग (जस्तै: जग, पिल्लर, छत)।",
                    use: "किन प्रयोग गर्ने? - कामलाई स-साना भागमा बाँडेर सजिलै निगरानी गर्न।",
                    steps: [
                        "नयाँ काम सुरु गर्न 'Add New Phase' थिच्नुहोस्।",
                        "कामको गति (%) हेर्न 'Live' संकेत हेर्नुहोस्।",
                        "क्रम मिलाउन कार्डलाई समातेर माथि-तल सार्नुहोस्।"
                    ]
                },
                {
                    head: "तल्ला र कोठा (Floors & Rooms):",
                    definition: "यो भनेको के हो? - घरको भौतिक आकार र कोठाहरूको विवरण।",
                    use: "किन प्रयोग गर्ने? - कुन कोठामा कति खर्च भयो र कस्तो सामान लाग्यो भनेर थाहा पाउन।",
                    steps: [
                        "'Floors' मा गएर तल्लाको नाम (जस्तै: Ground Floor) थप्नुहोस्।",
                        "'Rooms' मा गएर कोठाहरू (जस्तै: Kitchen, Bedroom) मिलाउनुहोस्।"
                    ]
                }
            ],
            tip: "टिप: जगदेखि नै सबै चरणहरू (Phases) थप्दा प्रोजेक्टको अन्त्यसम्मको हिसाब स्पष्ट हुन्छ।",
            color: "emerald"
        },
        {
            title: "२. पैसाको हिसाब (Finance) 💰",
            description: "बजेट, खर्च र लगानी व्यवस्थापन",
            icon: "💰",
            details: [
                {
                    head: "बजेट शिर्षक (Category):",
                    definition: "यो भनेको के हो? - खर्च हुने क्षेत्रहरू (जस्तै: सिमेन्ट, रड, ज्याला)।",
                    use: "किन प्रयोग गर्ने? - कुन क्षेत्रमा बजेट बढी खर्च भइरहेको छ भनेर नियन्त्रण गर्न।",
                    steps: [
                        "सुरुमा 'Categories' थिचेर मुख्य खर्चका क्षेत्रहरू छुट्याउनुहोस्।",
                        "प्रत्येक शिर्षकमा कति बजेट छ, त्यो भर्नुहोस्।"
                    ]
                },
                {
                    head: "खर्च (Expenses) र लगानी (Funding):",
                    definition: "यो भनेको के हो? - लगानी (आएको पैसा) र खर्च (गएको पैसा) को रेकर्ड।",
                    use: "किन प्रयोग गर्ने? - बैंक ब्यालेन्स र घर बनाउँदा लागेको वास्तविक लागत मिलाउन।",
                    steps: [
                        "पैसा आउँदा 'Funding' र खर्च हुँदा 'Expenses' मा इन्ट्री गर्नुहोस्।",
                        "खर्च गर्दा सम्बन्धित बिलको फोटो खिचेर राख्नुहोस्।"
                    ]
                }
            ],
            tip: "टिप: सिमेन्ट वा रड जस्ता ठूला खर्चका लागि छुट्टै 'Category' बनाउनु राम्रो हुन्छ।",
            color: "teal"
        },
        {
            title: "३. सामान र स्रोत (Resources) 📦",
            description: "सप्लायर, ठेकेदार र सामग्री मौज्दात",
            icon: "📦",
            details: [
                {
                    head: "सामानको मौज्दात (Stock):",
                    definition: "यो भनेको के हो? - स्टोरमा बाँकी रहेको निर्माण सामग्री (सिमेन्टको बोरा, इँटा)।",
                    use: "किन प्रयोग गर्ने? - काम भइरहेको बेला सामान अचानक सकिएर काम नरोकियोस् भन्नका लागि।",
                    steps: [
                        "सामान किनेपछि 'Materials' मा रेकर्ड राख्नुहोस्।",
                        "'Stock' मा गएर कति सामान बाँकी छ, समय-समयमा हेर्नुहोस्।"
                    ]
                },
                {
                    head: "ठेकेदार र सप्लायर (Partners):",
                    definition: "यो भनेको के हो? - सामान दिने पसल र काम गर्ने मिस्त्रीहरूको विवरण।",
                    use: "किन प्रयोग गर्ने? - लेनदेनको हिसाब सफा राख्न र सम्पर्क गर्न सजिलो होस् भन्न।",
                    steps: [
                        "सप्लायर र ठेकेदारको नाम र नम्बर सुरक्षित राख्नुहोस्।",
                        "भुक्तानी गर्दा 'Payments' सेक्सनमा तुरुन्तै रेकर्ड चढाउनुहोस्।"
                    ]
                }
            ],
            tip: "टिप: सामान थोरै बाँकी छँदै अर्डर दिनुहोस् ताकि कामदारहरू खाली बस्नु नपरोस्।",
            color: "slate"
        }
    ];

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="विस्तृत प्रयोगकर्ता गाइड"
        >
            <div className="space-y-4 py-2">
                <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl rotate-12">📚</div>
                    <div className="relative z-10 space-y-2">
                        <h2 className="text-emerald-400 font-black text-xs uppercase tracking-widest">Premium Hybrid UI</h2>
                        <p className="text-[14px] font-bold leading-relaxed">
                            यो गाइडले तपाईंलाई एपका प्रत्येक फिचरको परिभाषा (Defination) र प्रयोग (Use) बुझ्न मद्दत गर्नेछ।
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {guideSections.map((section, idx) => {
                        const isExpanded = expandedSection === idx;
                        const colorClass = section.color;
                        
                        return (
                            <div 
                                key={idx} 
                                className={`rounded-[2.5rem] border transition-all duration-500 overflow-hidden ${
                                    isExpanded 
                                    ? `border-${colorClass}-500/30 bg-white shadow-2xl translate-y-[-4px]` 
                                    : `border-slate-100 bg-slate-50/50 hover:bg-white`
                                }`}
                            >
                                <button 
                                    onClick={() => setExpandedSection(isExpanded ? null : idx)}
                                    className="w-full p-6 flex justify-between items-center text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm bg-white border border-slate-50`}>
                                            {section.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-slate-800 font-black text-sm leading-tight">{section.title}</h3>
                                            <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${isExpanded ? `text-${colorClass}-600` : 'text-slate-400'}`}>
                                                {section.description}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-500 ${isExpanded ? 'bg-slate-900 border-slate-900 rotate-180' : 'bg-white border-slate-100'}`}>
                                        <span className={`text-[10px] ${isExpanded ? 'text-white' : 'text-slate-400'}`}>▼</span>
                                    </div>
                                </button>
                                
                                {isExpanded && (
                                    <div className="px-6 pb-8 space-y-8 animate-fadeIn">
                                        <div className="h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent"></div>
                                        
                                        {/* PRO-TIP BOX */}
                                        <div className={`p-4 rounded-3xl bg-${colorClass}-50/50 border border-${colorClass}-100/50 flex gap-4`}>
                                            <div className="flex flex-col items-center">
                                                <span className="text-xl">💡</span>
                                                <span className="text-[7px] font-black text-emerald-600 uppercase">Pro Tip</span>
                                            </div>
                                            <p className={`text-[13px] font-bold text-${colorClass}-700 leading-relaxed italic`}>
                                                {section.tip}
                                            </p>
                                        </div>

                                        <div className="space-y-8">
                                            {section.details.map((detail, dIdx) => (
                                                <div key={dIdx} className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2 h-6 rounded-full bg-${colorClass}-500 shadow-lg shadow-${colorClass}-200`}></div>
                                                        <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight">{detail.head}</span>
                                                    </div>
                                                    
                                                    <div className="space-y-3 pl-5 border-l border-slate-50 ml-1">
                                                        <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                                                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1 tracking-widest">परिभाषा र उपयोग</p>
                                                            <p className="text-[14px] font-bold text-slate-700 leading-relaxed mb-1">{detail.definition}</p>
                                                            <p className="text-[14px] font-bold text-emerald-600 leading-relaxed italic">{detail.use}</p>
                                                        </div>

                                                        <div className="space-y-2.5 pt-1">
                                                            <p className="text-[10px] text-slate-400 font-black uppercase mb-2 tracking-widest">कसरी चलाउने? (Steps)</p>
                                                            {detail.steps.map((step, sIdx) => (
                                                                <div key={sIdx} className="flex gap-4 items-start">
                                                                    <div className={`w-6 h-6 rounded-xl bg-${colorClass}-50 flex items-center justify-center text-[10px] font-black text-${colorClass}-600 shrink-0`}>
                                                                        {sIdx + 1}
                                                                    </div>
                                                                    <p className="text-[14px] text-slate-600 leading-relaxed font-bold pt-1">
                                                                        {step}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="pt-6">
                    <button 
                        onClick={onClose}
                        className="w-full py-5 bg-slate-900 text-white rounded-[2.5rem] font-black text-sm shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 group"
                    >
                        <span>मैले बुझें</span>
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                            <span className="text-xs">✓</span>
                        </div>
                    </button>
                    <p className="text-center text-[9px] text-slate-300 font-black uppercase tracking-[0.4em] mt-8">
                        Advanced Engine • Construction Pro
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default GuideModal;
