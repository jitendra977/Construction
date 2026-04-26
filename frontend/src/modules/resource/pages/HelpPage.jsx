/**
 * HelpPage — स्रोत मोड्युलको सहायता पृष्ठ (नेपाली)
 * Resource module help page written in Nepali.
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
    cyan:   'bg-cyan-50 text-cyan-700 border-cyan-200',
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-black rounded-full border ${styles[color] || styles.gray}`}>
      {label}
    </span>
  );
};

export default function HelpPage() {
    const base = usePlatformBase();
  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">📖</span>
          <div>
            <h1 className="text-lg font-black">स्रोत मोड्युल — सहायता केन्द्र</h1>
            <p className="text-gray-300 text-xs mt-0.5">Resource Module Help Center</p>
          </div>
        </div>
        <p className="text-gray-300 text-xs leading-relaxed">
          यस पृष्ठमा स्रोत मोड्युलका सबै ट्याबहरूको विस्तृत विवरण छ — के हो, किन चाहिन्छ, कहिले प्रयोग गर्ने, र कसले प्रयोग गर्ने।
          निर्माण परियोजनाको सामग्री, उपकरण, श्रमिक, आपूर्तिकर्ता र खरिद आदेशको सम्पूर्ण व्यवस्थापन यसैबाट गर्न सकिन्छ।
        </p>
      </div>

      {/* How to Access */}
      <Section icon="🚀" title="स्रोत मोड्युल कसरी खोल्ने?" subtitle="पहुँच मार्गदर्शन — How to Access">
        <p>स्रोत मोड्युल खोल्न तलका दुई तरिकामध्ये कुनै एक प्रयोग गर्नुहोस्:</p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-[10px] font-black text-blue-600 uppercase mb-3">तरिका १ — Sidebar बाट</p>
          <ol className="text-xs text-blue-700 space-y-2 list-decimal list-inside">
            <li>बायाँतिरको मुख्य Sidebar मा हेर्नुहोस्</li>
            <li><strong>🏗️ Resource</strong> लिङ्कमा क्लिक गर्नुहोस्</li>
            <li>Resource मोड्युल सिधै खुल्छ — Dashboard देखिन्छ</li>
          </ol>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-[10px] font-black text-gray-600 uppercase mb-3">तरिका २ — URL सिधै टाइप गरेर</p>
          <div className="space-y-1.5">
            {[
              { path: `${base}/resource`,             label: 'Dashboard (मुख्य पृष्ठ)' },
              { path: `${base}/resource/materials`,   label: 'Materials (सामग्री)' },
              { path: `${base}/resource/equipment`,   label: 'Equipment (उपकरण)' },
              { path: `${base}/resource/labor`,       label: 'Labor (श्रमिक)' },
              { path: `${base}/resource/suppliers`,   label: 'Suppliers (आपूर्तिकर्ता)' },
              { path: `${base}/resource/purchases`,   label: 'Purchases (खरिद आदेश)' },
              { path: `${base}/resource/help`,        label: 'सहायता (यही पृष्ठ)' },
            ].map(({ path, label }) => (
              <div key={path} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-2">
                <span className="text-[10px] font-mono text-gray-500">{path}</span>
                <span className="text-[10px] font-bold text-gray-700 ml-4 whitespace-nowrap">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
          <p className="text-[10px] font-black text-yellow-700 uppercase mb-2">⚠️ पहिले गर्नु पर्ने काम</p>
          <ul className="text-xs text-yellow-700 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="font-black mt-0.5">१.</span>
              <span>Login गर्नुहोस् — बिना Login स्रोत मोड्युल खुल्दैन (JWT token चाहिन्छ)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-black mt-0.5">२.</span>
              <span>परियोजना (Project) छान्नुहोस् — कुनै परियोजना नछानी डेटा देखिँदैन</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-black mt-0.5">३.</span>
              <span>Backend चलिरहेको हुनुपर्छ — <span className="font-mono">python manage.py runserver</span> र <span className="font-mono">migrate</span> भएको हुनुपर्छ</span>
            </li>
          </ul>
        </div>
      </Section>

      {/* Overview */}
      <Section icon="🏗️" title="स्रोत मोड्युल भनेको के हो?" subtitle="परिचय">
        <p>
          स्रोत मोड्युल निर्माण परियोजनाको <strong>सम्पूर्ण भौतिक स्रोत व्यवस्थापन</strong> को लागि बनाइएको छ।
          सामग्री, उपकरण, श्रमिक, आपूर्तिकर्ता र खरिद आदेश — सबै एकै ठाउँमा।
        </p>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {[
            { icon: '🧱', label: 'Materials', desc: 'निर्माण सामग्री र स्टक' },
            { icon: '🚜', label: 'Equipment', desc: 'मेसिनरी र औजारहरू' },
            { icon: '👷', label: 'Labor', desc: 'श्रमिक र उपस्थिति' },
            { icon: '🏪', label: 'Suppliers', desc: 'विक्रेता र आपूर्तिकर्ता' },
            { icon: '📦', label: 'Purchases', desc: 'खरिद आदेश र प्राप्ति' },
            { icon: '📈', label: 'Stock Mgmt', desc: 'स्टक आवागमन ट्र्याकिङ' },
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

      {/* Materials */}
      <Section icon="🧱" title="सामग्री (Materials) — स्टक व्यवस्थापन" subtitle="/resource/materials">
        <QA
          q="के हो?"
          a="निर्माण परियोजनामा प्रयोग हुने सबै सामग्री (सिमेन्ट, रड, बालुवा, इट्टा, काठ आदि) को सूची र स्टक (भण्डार) व्यवस्थापन गर्ने ठाउँ।"
        />
        <QA
          q="किन चाहिन्छ?"
          a="सामग्री कति छ, कति थप गर्नुपर्छ, कुन सामग्री सकिन लागेको छ — सबै थाहा हुन्छ। कमी भएमा (Low Stock) स्वचालित रूपमा चेतावनी आउँछ।"
        />
        <QA
          q="कहिले प्रयोग गर्ने?"
          a="नयाँ सामग्री खरिद गर्दा (Stock In), निर्माणमा प्रयोग गर्दा (Stock Out), र सामग्रीको अवस्था जाँच्दा।"
        />
        <QA
          q="कसले प्रयोग गर्ने?"
          a="साइट इन्चार्ज र स्टोरकिपरले। सामग्री थप/निकाल्ने काम दैनिक रूपमा गर्नुपर्छ।"
        />

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-[10px] font-black text-blue-600 uppercase mb-2">सामग्री श्रेणीहरू</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'CEMENT', color: 'gray' },
              { label: 'STEEL', color: 'blue' },
              { label: 'SAND', color: 'yellow' },
              { label: 'BRICK', color: 'red' },
              { label: 'WOOD', color: 'green' },
              { label: 'ELECTRICAL', color: 'purple' },
              { label: 'PLUMBING', color: 'cyan' },
              { label: 'OTHER', color: 'gray' },
            ].map(({ label, color }) => <Badge key={label} color={color} label={label} />)}
          </div>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <p className="text-[10px] font-black text-red-600 uppercase mb-2">⚠️ Low Stock चेतावनी</p>
          <p className="text-xs text-red-600">
            सामग्रीको मात्रा <strong>Reorder Level</strong> भन्दा कम भएमा कार्ड रातो रङले हाइलाइट हुन्छ र Dashboard मा "Low Stock Items" मा देखिन्छ।
            तुरुन्त खरिद गर्नुहोस् — काम रोकिन सक्छ।
          </p>
        </div>
      </Section>

      {/* Stock Management Concept */}
      <Section icon="📊" title="स्टक व्यवस्थापन अवधारणा" subtitle="Stock Management Concept">
        <p>
          स्टक व्यवस्थापन भनेको सामग्री कति छ, कति आयो, कति गयो — सबैको हिसाब राख्ने प्रक्रिया हो।
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <p className="text-[10px] font-black text-green-700 uppercase mb-2">📥 Stock In (आगमन)</p>
            <p className="text-xs text-green-700">
              सामग्री किन्दा वा प्राप्त हुँदा Stock In गर्नुहोस्। यसले भण्डारको मात्रा बढ्छ।
              खरिद आदेश प्राप्त गर्दा (Receive) स्वचालित Stock In हुन सक्छ।
            </p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-[10px] font-black text-red-700 uppercase mb-2">📤 Stock Out (खपत)</p>
            <p className="text-xs text-red-700">
              निर्माण कार्यमा सामग्री प्रयोग गर्दा Stock Out गर्नुहोस्। यसले भण्डारको मात्रा घट्छ।
              Reference नम्बर दिनुहोस् — पछि ट्र्याक गर्न सजिलो हुन्छ।
            </p>
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-[10px] font-black text-gray-600 uppercase mb-2">📈 Stock Movements</p>
          <p className="text-xs text-gray-600">
            हरेक Stock In र Stock Out को इतिहास <strong>Stock Movements</strong> मा दर्ता हुन्छ।
            Dashboard मा हालैका आवागमनहरू देख्न सकिन्छ। कुनै सामग्रीको इतिहास हेर्न API मार्फत फिल्टर गर्न सकिन्छ।
          </p>
        </div>
      </Section>

      {/* Equipment */}
      <Section icon="🚜" title="उपकरण (Equipment) — मेसिनरी व्यवस्थापन" subtitle="/resource/equipment">
        <QA
          q="के हो?"
          a="परियोजनामा प्रयोग हुने JCB, Crane, Mixer, Generator जस्ता मेसिनरी र औजारहरूको सूची र अवस्था ट्र्याक गर्ने ठाउँ।"
        />
        <QA
          q="किन चाहिन्छ?"
          a="कुन उपकरण उपलब्ध छ, कुन प्रयोगमा छ, कुन मर्मतमा छ — सबै थाहा हुन्छ। दैनिक भाडा दर पनि राख्न सकिन्छ।"
        />
        <QA
          q="कहिले प्रयोग गर्ने?"
          a="नयाँ उपकरण किन्दा वा भाडामा लिँदा, उपकरणको अवस्था परिवर्तन हुँदा (Available → In Use → Maintenance), र उपकरणको खर्च गणना गर्दा।"
        />
        <QA
          q="कसले प्रयोग गर्ने?"
          a="साइट इन्चार्ज र परियोजना प्रमुखले। उपकरण कहाँ छ र कसले प्रयोग गरिरहेको छ ट्र्याक गर्न।"
        />
        <div className="grid grid-cols-2 gap-2">
          {[
            { status: 'AVAILABLE', color: 'green', desc: 'उपलब्ध — प्रयोग गर्न तयार' },
            { status: 'IN_USE', color: 'blue', desc: 'प्रयोगमा — साइटमा काम गर्दै' },
            { status: 'MAINTENANCE', color: 'yellow', desc: 'मर्मत — मर्मत भइरहेको' },
            { status: 'RETIRED', color: 'red', desc: 'अवकाश — प्रयोग बन्द' },
          ].map(({ status, color, desc }) => (
            <div key={status} className="flex items-start gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
              <Badge color={color} label={status} />
              <p className="text-[10px] text-gray-500 leading-tight">{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Labor */}
      <Section icon="👷" title="श्रमिक (Labor) — कामदार व्यवस्थापन" subtitle="/resource/labor">
        <QA
          q="के हो?"
          a="परियोजनामा कार्यरत सबै कामदार (Mason, Carpenter, Electrician, Helper आदि) को सूची र दैनिक उपस्थिति (Attendance) व्यवस्थापन गर्ने ठाउँ।"
        />
        <QA
          q="किन चाहिन्छ?"
          a="कति कामदार छन्, कति हाजिर छन्, कसले कति दिन काम गरे, कुल ज्याला कति हुन्छ — सबै थाहा हुन्छ। ज्याला विवाद हुन दिँदैन।"
        />
        <QA
          q="कहिले प्रयोग गर्ने?"
          a="नयाँ कामदार राख्दा, प्रत्येक दिन उपस्थिति चिह्न गर्दा, र महिनाको अन्त्यमा ज्याला हिसाब गर्दा।"
        />
        <QA
          q="कसले प्रयोग गर्ने?"
          a="साइट इन्चार्ज र माटासरले। दैनिक उपस्थिति चिह्न गर्ने काम इन्चार्जले गर्नुपर्छ।"
        />
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-[10px] font-black text-blue-600 uppercase mb-2">उपस्थिति कसरी चिह्न गर्ने?</p>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>Labor ट्याब खोल्नुहोस्</li>
            <li>कामदारको नाम अगाडि "Attendance" बटन थिच्नुहोस्</li>
            <li>मिति, Present/Absent, ओभरटाइम घण्टा भर्नुहोस्</li>
            <li>"Mark Attendance" बटन थिच्नुहोस्</li>
          </ol>
        </div>
      </Section>

      {/* Suppliers */}
      <Section icon="🏪" title="आपूर्तिकर्ता (Suppliers) — विक्रेता व्यवस्थापन" subtitle="/resource/suppliers">
        <QA
          q="के हो?"
          a="परियोजनामा सामग्री वा सेवा आपूर्ति गर्ने कम्पनी वा व्यक्तिहरूको सूची। नाम, सम्पर्क, विशेषता र नोटहरू राख्न सकिन्छ।"
        />
        <QA
          q="किन चाहिन्छ?"
          a="खरिद आदेश बनाउँदा आपूर्तिकर्ता छान्नु पर्छ — त्यसका लागि पहिले यहाँ दर्ता गर्नुपर्छ। सम्पर्क नम्बर र विशेषता सजिलै भेटिन्छ।"
        />
        <QA
          q="कहिले प्रयोग गर्ने?"
          a="नयाँ आपूर्तिकर्ताले काम सुरु गर्दा, सम्पर्क विवरण अद्यावधिक गर्दा, र खरिद आदेश बनाउनुभन्दा अघि।"
        />
        <QA
          q="कसले प्रयोग गर्ने?"
          a="परियोजना प्रमुख र खरिद प्रबन्धकले। नयाँ आपूर्तिकर्ता थप्ने अधिकार परियोजना प्रमुखसँग हुनुपर्छ।"
        />
      </Section>

      {/* Purchases */}
      <Section icon="📦" title="खरिद आदेश (Purchase Orders) — खरिद व्यवस्थापन" subtitle="/resource/purchases">
        <QA
          q="के हो?"
          a="आपूर्तिकर्ताबाट सामग्री खरिद गर्ने आदेश (PO — Purchase Order) बनाउने र ट्र्याक गर्ने ठाउँ। प्रत्येक आदेशमा सामग्रीको सूची र रकम राख्न सकिन्छ।"
        />
        <QA
          q="किन चाहिन्छ?"
          a="कुन आदेश पठाइएको छ, कुन प्राप्त भयो, कुन रद्द भयो — सबै ट्र्याक हुन्छ। आदेश प्राप्त गर्दा (Receive) स्वचालित रूपमा स्टक बढ्छ।"
        />
        <QA
          q="कहिले प्रयोग गर्ने?"
          a="नयाँ सामग्री खरिद गर्नुपर्दा, आदेशको अवस्था जाँच्दा, र सामग्री प्राप्त भएपछि Receive गर्दा।"
        />
        <QA
          q="कसले प्रयोग गर्ने?"
          a="खरिद प्रबन्धक र परियोजना प्रमुखले। ORDERED अवस्थाको आदेश प्राप्त भएपछि Receive थिच्नुहोस्।"
        />
        <div className="grid grid-cols-2 gap-2 pt-1">
          {[
            { status: 'DRAFT', color: 'gray', desc: 'मस्यौदा — अझै पठाइएको छैन' },
            { status: 'ORDERED', color: 'blue', desc: 'आदेश दिइएको — प्रतीक्षामा' },
            { status: 'RECEIVED', color: 'green', desc: 'प्राप्त — स्टक अद्यावधिक' },
            { status: 'CANCELLED', color: 'red', desc: 'रद्द — आदेश रद्द भयो' },
          ].map(({ status, color, desc }) => (
            <div key={status} className="flex items-start gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
              <Badge color={color} label={status} />
              <p className="text-[10px] text-gray-500 leading-tight">{desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-[10px] font-black text-green-700 uppercase mb-2">खरिद आदेश कसरी प्राप्त गर्ने?</p>
          <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside">
            <li>Purchases ट्याब खोल्नुहोस्</li>
            <li>ORDERED अवस्थाको आदेशमा "Receive" बटन थिच्नुहोस्</li>
            <li>पुष्टि गर्नुहोस् — आदेश RECEIVED मा जान्छ</li>
            <li>सामग्रीको स्टक स्वचालित रूपमा बढ्छ</li>
          </ol>
        </div>
      </Section>

      {/* Who uses what */}
      <Section icon="👤" title="कसले कुन ट्याब प्रयोग गर्ने?" subtitle="भूमिका अनुसार मार्गदर्शन">
        <div className="space-y-3">
          {[
            {
              role: '👷 परियोजना प्रमुख',
              tabs: ['Dashboard', 'Equipment', 'Suppliers', 'Purchases'],
              desc: 'दैनिक अवस्था हेर्ने, ठूला निर्णय गर्ने',
            },
            {
              role: '🏗️ साइट इन्चार्ज',
              tabs: ['Materials', 'Equipment', 'Labor'],
              desc: 'दैनिक स्टक, उपकरण र कामदार व्यवस्थापन',
            },
            {
              role: '📦 खरिद प्रबन्धक',
              tabs: ['Materials', 'Suppliers', 'Purchases'],
              desc: 'खरिद आदेश बनाउने, आपूर्ति व्यवस्थापन',
            },
            {
              role: '📋 माटासर/Timekeeper',
              tabs: ['Labor'],
              desc: 'दैनिक उपस्थिति चिह्न गर्ने',
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

      {/* Quick tips */}
      <Section icon="💡" title="छिटो सुझावहरू" subtitle="राम्रो बानीहरू">
        <ul className="space-y-2 text-sm">
          {[
            'सामग्री खरिद गरेको दिनै Stock In गर्नुहोस् — भण्डारको हिसाब मिलिरहन्छ।',
            'Reorder Level सही राख्नुहोस् — Low Stock चेतावनी समयमा आउँछ।',
            'प्रत्येक दिन कामदारको उपस्थिति चिह्न गर्नुहोस् — महिनाको अन्त्यमा झमेला हुँदैन।',
            'आपूर्तिकर्ता थप्नु अघि Purchases ट्याब जाँच्नुहोस् — पहिले नै छ कि?',
            'खरिद आदेशमा Reference नम्बर दिनुहोस् — आपूर्तिकर्तासँग कुरा गर्दा सजिलो हुन्छ।',
            'उपकरणको अवस्था नियमित अद्यावधिक गर्नुहोस् — कुन उपकरण फ्री छ थाहा हुन्छ।',
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
