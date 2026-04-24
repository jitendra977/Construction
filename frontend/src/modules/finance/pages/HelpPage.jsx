/**
 * HelpPage — वित्त मोड्युलको सहायता पृष्ठ (नेपाली)
 * Finance module help page written in Nepali.
 * Placed after Ledger in the sidebar.
 */

const Section = ({ icon, title, subtitle, children }) => (
  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <h2 className="text-sm font-black text-gray-900">{title}</h2>
        {subtitle && <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="px-6 py-5 space-y-4 text-sm text-gray-700 leading-relaxed">
      {children}
    </div>
  </div>
);

const QA = ({ q, a }) => (
  <div>
    <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1">{q}</p>
    <p className="text-sm text-gray-700 leading-relaxed">{a}</p>
  </div>
);

const Badge = ({ color, label }) => {
  const styles = {
    green:  'bg-green-50 text-green-700 border-green-200',
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray:   'bg-gray-50 text-gray-600 border-gray-200',
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-black rounded-full border ${styles[color]}`}>
      {label}
    </span>
  );
};

export default function HelpPage() {
  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">📖</span>
          <div>
            <h1 className="text-lg font-black">वित्त मोड्युल — सहायता केन्द्र</h1>
            <p className="text-gray-300 text-xs mt-0.5">Finance Module Help Center</p>
          </div>
        </div>
        <p className="text-gray-300 text-xs leading-relaxed">
          यस पृष्ठमा वित्त मोड्युलका सबै ट्याबहरूको विस्तृत विवरण छ — के हो, किन चाहिन्छ, कहिले प्रयोग गर्ने, र कसले प्रयोग गर्ने।
          निर्माण परियोजनाको सम्पूर्ण आर्थिक व्यवस्थापन यसैबाट गर्न सकिन्छ।
        </p>
      </div>

      {/* Overview */}
      <Section icon="💰" title="वित्त मोड्युल भनेको के हो?" subtitle="परिचय">
        <p>
          वित्त मोड्युल निर्माण परियोजनाको <strong>सम्पूर्ण पैसा व्यवस्थापन</strong> को लागि बनाइएको छ।
          ब्याङ्क खाता, ऋण, पैसा सार्ने, खाताबही, बिल र बजेट — सबै एकै ठाउँमा।
        </p>
        <p>
          यो मोड्युल <strong>दोहोरो-प्रविष्टि लेखाङ्कन</strong> (Double-Entry Accounting) को सिद्धान्तमा आधारित छ।
          अर्थात् हरेक पैसाको आवागमनको दुई पक्ष (debit र credit) स्वचालित रूपमा दर्ता हुन्छ — गल्ती हुन सक्दैन।
        </p>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {[
            { icon: '🏦', label: 'Banking', desc: 'ब्याङ्क र नगद खाता' },
            { icon: '📋', label: 'Loans', desc: 'ऋण र किस्ता' },
            { icon: '🔄', label: 'Transfers', desc: 'खाताबिच पैसा सार्ने' },
            { icon: '📒', label: 'Ledger', desc: 'खाताबही र जर्नल' },
            { icon: '🧾', label: 'Bills', desc: 'विक्रेता बिल र भुक्तानी' },
            { icon: '🎯', label: 'Budget', desc: 'बजेट र खर्च ट्र्याकिङ' },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-xl">{icon}</span>
              <div>
                <p className="text-xs font-black text-gray-800">{label}</p>
                <p className="text-[10px] text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Dashboard */}
      <Section icon="📊" title="Dashboard — वित्तीय सारांश" subtitle="/finance/">
        <QA
          q="के हो?"
          a="परियोजनाको सम्पूर्ण आर्थिक अवस्थाको एकै नजरमा सारांश। कुल नगद, बाँकी ऋण, अपठित बिल, र हालैका ट्रान्सफरहरू देखिन्छन्।"
        />
        <QA
          q="किन चाहिन्छ?"
          a="प्रत्येक दिन काम सुरु गर्नु अघि परियोजनाको आर्थिक स्वास्थ्य हेर्न। कुनै खाताको पैसा सकिन लागेको छ कि, कुनै बिल म्याद नाघेको छ कि — सबै एकै ठाउँमा थाहा हुन्छ।"
        />
        <QA
          q="कहिले प्रयोग गर्ने?"
          a="दैनिक रूपमा, काम सुरु गर्दा। कुनै ठूलो भुक्तानी गर्नु अघि नगद स्थिति जाँच्दा।"
        />
        <QA
          q="कसले प्रयोग गर्ने?"
          a="परियोजना प्रमुख, साइट इन्चार्ज, र लेखापाल — सबैले। कसैलाई पनि परियोजनाको पैसा अवस्था थाहा पाउन यहाँबाट सुरु गर्नुपर्छ।"
        />
      </Section>

      {/* Banking */}
      <Section icon="🏦" title="Banking — ब्याङ्किङ" subtitle="/finance/banking">
        <QA
          q="के हो?"
          a="परियोजनासँग सम्बन्धित सबै ब्याङ्क खाता र नगद बाकसको व्यवस्थापन। खाता थप्ने, सम्पादन गर्ने, र रकम जम्मा गर्ने काम यहाँबाट हुन्छ।"
        />
        <QA
          q="किन चाहिन्छ?"
          a="परियोजनामा धेरै ब्याङ्क खाता हुन सक्छ — Nabil Bank, NIC Asia, Petty Cash। सबैको ब्यालेन्स एकै ठाउँमा देख्न र व्यवस्थापन गर्न।"
        />
        <QA
          q="कहिले प्रयोग गर्ने?"
          a="नयाँ खाता खोल्दा, ब्याङ्कबाट पैसा प्राप्त हुँदा (Opening Balance वा deposit), र खाताको जानकारी अद्यावधिक गर्दा।"
        />
        <QA
          q="कसले प्रयोग गर्ने?"
          a="लेखापाल र परियोजना प्रमुखले। नयाँ खाता थप्ने अधिकार परियोजना प्रमुखसँग हुनुपर्छ।"
        />
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-[10px] font-black text-blue-600 uppercase mb-2">कसरी गर्ने — Opening Balance थप्ने</p>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>Banking ट्याब खोल्नुहोस्</li>
            <li>"+ Add Account" थिच्नुहोस् र ब्याङ्क विवरण भर्नुहोस्</li>
            <li>खाता बनेपछि "+ Deposit" बटन थिच्नुहोस्</li>
            <li>रकम र विवरणमा "Opening Balance" लेख्नुहोस्</li>
            <li>Submit गर्नुहोस् — ब्यालेन्स स्वचालित रूपमा अद्यावधिक हुन्छ</li>
          </ol>
        </div>
      </Section>

      {/* Loans */}
      <Section icon="📋" title="Loans — ऋण व्यवस्थापन" subtitle="/finance/loans">
        <QA
          q="के हो?"
          a="परियोजनाले लिएका सबै ऋणको व्यवस्थापन। ऋणको विवरण, ब्याजदर, किस्ता रकम, र मासिक भुक्तानी (EMI) यहाँबाट गर्न सकिन्छ।"
        />
        <QA
          q="किन चाहिन्छ?"
          a="ठूला निर्माण परियोजनामा ब्याङ्क ऋण सामान्य हो। कुन महिनामा कति किस्ता तिर्नुपर्छ, कति साँवा घटेको छ, कति ब्याज गएको छ — सबै ट्र्याक गर्न।"
        />
        <QA
          q="कहिले प्रयोग गर्ने?"
          a="नयाँ ऋण लिँदा, मासिक किस्ता (EMI) तिर्दा, र ऋणको बाँकी रकम जाँच्दा।"
        />
        <QA
          q="कसले प्रयोग गर्ने?"
          a="लेखापाल र परियोजना प्रमुखले। किस्ता तिर्ने काम प्रत्येक महिना लेखापालले गर्नुपर्छ।"
        />
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
          <p className="text-[10px] font-black text-yellow-700 uppercase mb-2">किस्ता (EMI) गणना सूत्र</p>
          <p className="text-xs text-yellow-800 font-mono">EMI = (P × r × (1+r)^n) / ((1+r)^n - 1)</p>
          <p className="text-[10px] text-yellow-600 mt-2">P = मूल ऋण रकम &nbsp;|&nbsp; r = मासिक ब्याज दर &nbsp;|&nbsp; n = कुल महिना</p>
          <p className="text-[10px] text-yellow-600 mt-1">ऋण बनाउँदा साँवा, ब्याजदर र अवधि टाइप गर्दा EMI स्वचालित गणना हुन्छ।</p>
        </div>
        <QA
          q="Amortization Schedule भनेको के हो?"
          a="ऋणको प्रत्येक महिनाको किस्तामा कति साँवा र कति ब्याज छ भनेर देखाउने तालिका। 'View amortization schedule' लिङ्कमा थिचेर हेर्न सकिन्छ।"
        />
      </Section>

      {/* Transfers */}
      <Section icon="🔄" title="Transfers — पैसा सार्ने" subtitle="/finance/transfers">
        <QA
          q="के हो?"
          a="एउटा ब्याङ्क खाता वा नगद बाकसबाट अर्कोमा पैसा सार्ने काम। उदाहरण: Nabil Bank बाट Petty Cash मा साइट खर्चको लागि पैसा झिक्ने।"
        />
        <QA
          q="किन चाहिन्छ?"
          a="साइटमा नगदको आवश्यकता पर्दा मुख्य ब्याङ्क खाताबाट Petty Cash मा पैसा सार्नुपर्छ। यो काम Transfer बाट गर्दा दुवै खाताको ब्यालेन्स स्वचालित रूपमा अद्यावधिक हुन्छ र जर्नलमा दर्ता हुन्छ।"
        />
        <QA
          q="कहिले प्रयोग गर्ने?"
          a="साइटको दैनिक खर्चको लागि नगद चाहिँदा, एउटा खाताबाट अर्कोमा भुक्तानी गर्दा, वा नगद व्यवस्थापन गर्दा।"
        />
        <QA
          q="कसले प्रयोग गर्ने?"
          a="साइट इन्चार्ज वा लेखापालले। पैसा सार्नुभन्दा अघि सम्बन्धित खाताको ब्यालेन्स जाँच गर्नुहोस्।"
        />
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-[10px] font-black text-gray-600 uppercase mb-2">महत्वपूर्ण</p>
          <p className="text-xs text-gray-600">ट्रान्सफर एकपटक गरेपछि <strong>सम्पादन वा मेट्न मिल्दैन</strong> — यो जानाजान गरिएको छ। गल्ती भयो भने उल्टो ट्रान्सफर गर्नुहोस्।</p>
        </div>
      </Section>

      {/* Ledger */}
      <Section icon="📒" title="Ledger — खाताबही" subtitle="/finance/ledger">
        <QA
          q="के हो?"
          a="परियोजनाका सबै खाताको सूची (Chart of Accounts) र सबै जर्नल प्रविष्टिहरू हेर्ने ठाउँ। यहाँ ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE जस्ता सबै प्रकारका खाता हेर्न र थप्न सकिन्छ।"
        />
        <QA
          q="किन चाहिन्छ?"
          a="हरेक वित्तीय काम (deposit, transfer, EMI, bill payment) पछाडि स्वचालित रूपमा जर्नल प्रविष्टि हुन्छ। लेखापाल वा अडिटरले जर्नल प्रविष्टि जाँच्न र खाताको ब्यालेन्स प्रमाणित गर्न यो ट्याब प्रयोग गर्छन्।"
        />
        <QA
          q="कहिले प्रयोग गर्ने?"
          a="महिनाको अन्त्यमा लेखा मिलान (reconciliation) गर्दा, अडिटर आउँदा, वा कुनै खाताको इतिहास हेर्दा।"
        />
        <QA
          q="कसले प्रयोग गर्ने?"
          a="मुख्यतः लेखापालले। साइट इन्चार्जलाई यो ट्याब हेर्न आवश्यक नपर्न सक्छ।"
        />
        <div className="grid grid-cols-2 gap-2 pt-1">
          {[
            { type: 'ASSET', color: 'blue', desc: 'सम्पत्ति — ब्याङ्क खाता, नगद' },
            { type: 'LIABILITY', color: 'red', desc: 'दायित्व — ऋण, देय रकम' },
            { type: 'EQUITY', color: 'purple', desc: 'पुँजी — लगानी, आय बाँकी' },
            { type: 'EXPENSE', color: 'yellow', desc: 'खर्च — सामग्री, ज्याला' },
          ].map(({ type, color, desc }) => (
            <div key={type} className="flex items-start gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
              <Badge color={color} label={type} />
              <p className="text-[10px] text-gray-500 leading-tight">{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Bills */}
      <Section icon="🧾" title="Bills — बिल व्यवस्थापन" subtitle="/finance/bills">
        <QA
          q="के हो?"
          a="विक्रेता (supplier/contractor) बाट आएका बिलहरू दर्ता गर्ने र भुक्तानी ट्र्याक गर्ने ठाउँ। कति बिल बाँकी छ, कुन म्याद नाघ्यो, कति तिर्न बाँकी छ — सबै यहाँ।"
        />
        <QA
          q="किन चाहिन्छ?"
          a="निर्माणमा सिमेन्ट, रड, ढुङ्गा, बालुवा, मजदुर सबैको बिल आउँछ। कुन बिल तिर्न बाँकी छ भन्ने थाहा नभए काम रोकिन सक्छ। Bills ट्याबले सबै देय रकम एकै ठाउँमा राख्छ।"
        />
        <QA
          q="कहिले प्रयोग गर्ने?"
          a="विक्रेताबाट बिल प्राप्त हुँदा (बिल दर्ता), बिल तिर्दा (भुक्तानी दर्ता), र महिनाको अन्त्यमा कति देय रकम बाँकी छ हेर्दा।"
        />
        <QA
          q="कसले प्रयोग गर्ने?"
          a="लेखापाल र परियोजना प्रमुखले। विक्रेताले बिल दिँदा तुरुन्त दर्ता गर्ने बानी बसाल्नुहोस्।"
        />
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { status: 'UNPAID', color: 'red', desc: 'भुक्तानी नगरिएको' },
            { status: 'PARTIAL', color: 'yellow', desc: 'आंशिक भुक्तानी' },
            { status: 'PAID', color: 'green', desc: 'पूर्ण भुक्तानी भयो' },
          ].map(({ status, color, desc }) => (
            <div key={status} className="text-center p-2 bg-gray-50 rounded-xl border border-gray-100">
              <Badge color={color} label={status} />
              <p className="text-[10px] text-gray-500 mt-1">{desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
          <p className="text-[10px] font-black text-red-600 uppercase mb-1">⚠️ OVERDUE बिल</p>
          <p className="text-xs text-red-600">म्याद नाघेका बिलहरू रातो रङमा हाइलाइट हुन्छन्। Dashboard मा पनि "Overdue Bills" संख्या देखिन्छ। तुरुन्त भुक्तानी गर्नुहोस् अन्यथा विक्रेताले आपूर्ति रोक्न सक्छन्।</p>
        </div>
      </Section>

      {/* Budget */}
      <Section icon="🎯" title="Budget — बजेट व्यवस्थापन" subtitle="/finance/budget">
        <QA
          q="के हो?"
          a="परियोजनाको बजेट श्रेणीहरू (civil work, electrical, plumbing, आदि) बनाउने र प्रत्येकमा कति रकम विनियोजन गरिएको छ, कति खर्च भयो, कति बाँकी छ — ट्र्याक गर्ने ठाउँ।"
        />
        <QA
          q="किन चाहिन्छ?"
          a="बजेट नभई खर्च गर्दा कुन क्षेत्रमा बढी खर्च भयो थाहा हुँदैन। Budget ट्याबले योजना र वास्तविक खर्चको तुलना गर्छ — progress bar बाट सजिलै देख्न सकिन्छ।"
        />
        <QA
          q="कहिले प्रयोग गर्ने?"
          a="परियोजना सुरु गर्दा श्रेणी र बजेट तोक्दा, मासिक खर्च समीक्षा गर्दा, र कुनै श्रेणीको बजेट सकिन लागेको जाँच्दा।"
        />
        <QA
          q="कसले प्रयोग गर्ने?"
          a="परियोजना प्रमुखले बजेट तोक्ने र समीक्षा गर्ने, लेखापालले खर्च दर्ता गर्ने।"
        />
        <div className="space-y-2 pt-1">
          {[
            { pct: 45, label: 'Civil Work', color: 'bg-green-400' },
            { pct: 82, label: 'Electrical', color: 'bg-yellow-400' },
            { pct: 105, label: 'Plumbing',  color: 'bg-red-500' },
          ].map(({ pct, label, color }) => (
            <div key={label}>
              <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                <span className="font-semibold">{label}</span>
                <span className={pct > 100 ? 'text-red-600 font-black' : ''}>{pct}% खर्च</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          ))}
          <p className="text-[10px] text-red-500">↑ रातो bar भएको श्रेणीको बजेट सकिएको छ — तुरुन्त ध्यान दिनुहोस्।</p>
        </div>
      </Section>

      {/* Who uses what */}
      <Section icon="👤" title="कसले कुन ट्याब प्रयोग गर्ने?" subtitle="भूमिका अनुसार मार्गदर्शन">
        <div className="space-y-3">
          {[
            {
              role: '👷 परियोजना प्रमुख',
              tabs: ['Dashboard', 'Banking', 'Loans', 'Budget'],
              desc: 'दैनिक अवस्था हेर्ने, ठूला निर्णय गर्ने',
            },
            {
              role: '📝 लेखापाल',
              tabs: ['Banking', 'Loans', 'Transfers', 'Ledger', 'Bills'],
              desc: 'दैनिक कारोबार दर्ता गर्ने, जर्नल जाँच्ने',
            },
            {
              role: '🏗️ साइट इन्चार्ज',
              tabs: ['Dashboard', 'Transfers', 'Bills'],
              desc: 'नगद अनुरोध, बिल पेश गर्ने',
            },
            {
              role: '🔍 अडिटर',
              tabs: ['Ledger', 'Bills', 'Transfers'],
              desc: 'जर्नल प्रविष्टि र लेखा प्रमाणित गर्ने',
            },
          ].map(({ role, tabs, desc }) => (
            <div key={role} className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
              <p className="text-sm font-black text-gray-800 mb-1">{role}</p>
              <p className="text-[10px] text-gray-500 mb-2">{desc}</p>
              <div className="flex flex-wrap gap-1">
                {tabs.map((t) => <Badge key={t} color="gray" label={t} />)}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Double entry explainer */}
      <Section icon="⚖️" title="दोहोरो-प्रविष्टि लेखाङ्कन भनेको के हो?" subtitle="Double-Entry Accounting">
        <p>
          हरेक वित्तीय कारोबारको दुई पक्ष हुन्छ — एउटा खातामा <strong>Debit</strong> र अर्कोमा <strong>Credit</strong>।
          दुवैको रकम बराबर हुनुपर्छ। यसले गल्ती हुन दिँदैन।
        </p>
        <div className="space-y-3 pt-1">
          {[
            {
              title: '🏦 Deposit — ब्याङ्कमा पैसा जम्मा गर्दा',
              rows: [
                { acc: 'Nabil Bank (ASSET)',           type: 'DEBIT',  color: 'text-blue-600' },
                { acc: 'Opening Balance Equity (EQUITY)', type: 'CREDIT', color: 'text-green-600' },
              ],
            },
            {
              title: '🔄 Transfer — Nabil Bank → Petty Cash',
              rows: [
                { acc: 'Petty Cash (ASSET)',  type: 'DEBIT',  color: 'text-blue-600' },
                { acc: 'Nabil Bank (ASSET)',  type: 'CREDIT', color: 'text-green-600' },
              ],
            },
            {
              title: '💳 EMI — किस्ता तिर्दा',
              rows: [
                { acc: 'Bank Loan (LIABILITY)',       type: 'DEBIT',  color: 'text-blue-600' },
                { acc: 'Interest Expense (EXPENSE)',  type: 'DEBIT',  color: 'text-blue-600' },
                { acc: 'Nabil Bank (ASSET)',          type: 'CREDIT', color: 'text-green-600' },
              ],
            },
          ].map(({ title, rows }) => (
            <div key={title} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <p className="px-4 py-2 text-[10px] font-black text-gray-600 bg-gray-50 border-b border-gray-100">{title}</p>
              <table className="w-full text-xs">
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-2 text-gray-700">{r.acc}</td>
                      <td className={`px-4 py-2 font-black text-right ${r.color}`}>{r.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400">
          * यी जर्नल प्रविष्टिहरू स्वचालित रूपमा बन्छन् — तपाईंले म्यानुअल रूपमा गर्नु पर्दैन। Ledger ट्याबमा हेर्न सकिन्छ।
        </p>
      </Section>

      {/* Quick tips */}
      <Section icon="💡" title="छिटो सुझावहरू" subtitle="राम्रो बानीहरू">
        <ul className="space-y-2 text-sm">
          {[
            'खाता खोलेलगत्तै Opening Balance जम्मा गर्नुहोस् — पछि सम्झनु गाह्रो हुन्छ।',
            'बिल प्राप्त भएको दिनै दर्ता गर्नुहोस् — म्याद नाघ्यो भने थाहा हुन्छ।',
            'मासिक किस्ता (EMI) तिरेको दिनै दर्ता गर्नुहोस् — ऋणको बाँकी सही रहन्छ।',
            'हरेक ट्रान्सफरमा Reference नम्बर राख्नुहोस् — पछि खोज्न सजिलो हुन्छ।',
            'Dashboard हरेक दिन हेर्नुहोस् — अप्रत्याशित खर्च वा बाँकी बिल छिटो थाहा हुन्छ।',
            'Budget श्रेणी परियोजना सुरु हुनुअघि नै बनाउनुहोस् — खर्च ट्र्याकिङ सजिलो हुन्छ।',
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-green-500 font-black mt-0.5">✓</span>
              <span className="text-gray-600">{tip}</span>
            </li>
          ))}
        </ul>
      </Section>

    </div>
  );
}
