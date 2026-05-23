# Construction Platform — Developer Token-Saving Prompting Guide (टोकन-बचत प्रम्प्टिङ गाइड)

यो गाइड AI एजेन्ट (Antigravity) सँग काम गर्दा टोकन बचत गर्न, छिटो रेस्पोन्स पाउन र कोडलाई सुरक्षित रूपमा परिमार्जन गर्न तयार गरिएको हो। यसमा हरेक प्रम्प्टको भूमिका बुझाउन **परिभाषा (Definition) नेपालीमा** लेखिएको छ भने AI ले प्रम्प्टको भाषा अंग्रेजी मात्र बुझ्ने हुनाले **प्रम्प्टहरू (Prompts) अंग्रेजीमा** राखिएका छन्।

---

## 1. Golden Rules (मुख्य नियमहरू)

* 📌 **सधैं Absolute Path प्रयोग गर्नुहोस्**: फाइलको नाम मात्र नभनी सधैं absolute path र direct link प्रयोग गर्नुहोस् (जस्तै: `[api.js](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/mobile-app/src/services/api.js)`).
* 📍 **लाइन नम्बरहरू (Line Numbers) तोक्नुहोस्**: प्रम्प्ट पठाउँदा जहिले पनि फाइलको कुन लाइनमा परिवर्तन गर्ने हो, त्यो स्पष्ट लेख्नुहोस् (जस्तै: `#L20-L40`).
* 🚫 **ठूला फाइलहरू पूरै रिड नगर्न भन्नुहोस्**: प्रम्प्टमा नै स्पष्ट भन्नुहोस् कि आवश्यक लाइन मात्र हेर्नुहोस्।
* ⚡ **One-Time Check & No Loop Rule (एउटै जाँच र लुप निषेध)**: एजेन्टले त्रुटि सच्याउन बारम्बार स्वचालित लुप चलाउँदा टोकन बर्बाद हुन्छ। त्यसैले प्रम्प्टमा नै **"Run a single check. If it fails, stop immediately and report back"** (एउटै जाँच गर्नुहोस्, fail भएमा तुरुन्त रोकिनुहोस् र जानकारी दिनुहोस्) भनी लेख्नुहोस्।

---

## 2. 30+ Micro-Change Prompt Examples with Nepali Definitions (३०+ स-साना कोड परिवर्तनका प्रम्प्टहरू र नेपाली परिभाषाहरू)

यहाँ यस प्रोजेक्टका विभिन्न ६ वटा तहका लागि ३३ वटा सूक्ष्म (granular) प्रम्प्टहरू र तिनीहरूको नेपाली परिभाषा दिइएका छन्। यिनीहरूलाई कपी गरेर प्रयोग गर्न सक्नुहुन्छ:

### 🔐 Category 1: Accounts & JWT Authentication (५ प्रम्प्टहरू)

#### १. Worker Token मा नयाँ पेलोड थप्न (Add Custom Payload Data to Worker Tokens)
* **परिभाषा (Definition)**: यस परिवर्तनले कामदारहरूको पोर्टल लगइनका लागि जारी गरिने JWT टोकन पेलोडमा थप सुरक्षा तथा पहिचानका लागि अनुकूल डेटा (Claims) समावेश गर्दछ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: केवल ९५-११३ लाइनहरू मात्र चेक र रिप्लेस गर्ने हुनाले views फाइलको पूरै भाग स्क्यान गर्न पर्दैन।
```text
Please modify the token payload generation inside [accounts/views.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/accounts/views.py#L95-L113).

1. Inspect ONLY lines 95 to 113.
2. Add a custom claim 'is_worker_portal': True to the generated refresh token.
3. Apply changes surgically using replace_file_content.
4. One-Time Check: Run python compile check exactly once. If it fails, do not attempt to self-correct; stop and report back immediately.
```

#### २. Logout मा Refresh Token ब्ल्याकलिस्ट गर्न (Invalidate Refresh Token on Logout)
* **परिभाषा (Definition)**: प्रयोगकर्ताले लगआउट गर्दा पुरानो रिफ्रेस टोकन अवैध (Blacklisted) भए नभएको जाँच गरी सम्भावित सर्भर त्रुटि (500 Error) रोक्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: लगआउट भ्युसेटको सानो कोड ब्लक मात्र लक्षित गरिन्छ।
```text
Please refactor the logout logic in [accounts/views.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/accounts/views.py#L188-L200).

1. Inspect ONLY lines 188 to 200.
2. Ensure that if the refresh token is expired, the views returns a 400 Bad Request instead of throwing a 500 error.
3. Apply surgically.
4. One-Time Check: Verify syntax once. Do not loop if there are imports missing; stop and ask.
```

#### ३. Register Serializer मा फोन नम्बर भ्यालिडेसन थप्न (Phone Number Regex Validation)
* **परिभाषा (Definition)**: नयाँ खाता दर्ता गर्दा नेपाली मोबाइल नम्बरहरूको ढाँचा (+977 वा 98 बाट सुरु हुने) सही भए नभएको पक्का गर्न रेगुलर एक्सप्रेसन नियम थप्दछ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: सिरियलाइजर फाइलको केवल १५ लाइन मात्र स्क्यान हुन्छ।
```text
Please modify user register serializers in [accounts/serializers.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/accounts/serializers.py#L40-L55).

1. View lines 40 to 55 only.
2. Add a regex validator enforcing phone numbers must start with +977 or 98.
3. Perform a single syntax validation. If error, stop and report back.
```

#### ४. JWT Access Token को आयु ३० मिनेट तोक्न (Set JWT Access Token Lifetime)
* **परिभाषा (Definition)**: सेक्युरिटी हार्डनिङको लागि प्रणालीको ग्लोबल JWT कन्फिगरेशन सेटिङमा गई पहुँच टोकनको समयावधि ६० बाट घटाई ३० मिनेटमा सीमित गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: पूरै सेटिङ्स फाइल पढ्नुको सट्टा सेटिङ ब्लक मात्र लक्षित हुन्छ।
```text
Please adjust JWT lifetimes in [settings.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/config/settings.py#L345-L355).

1. Read ONLY lines 345 to 355.
2. Change the default JWT access lifetime environment lookup fallback from 60 to 30.
3. Replace surgically. Run the Django check command once. Do not auto-correct on failure.
```

#### ५. QR Code Token को म्याद १५ मिनेट राख्न (Limit QR Token Expiration Time)
* **परिभाषा (Definition)**: हाजिरी प्रणालीमा कीर्ते रोक्न जेनेरेट गरिएको हाजिरी QR टोकनको वैधता अवधि १५ मिनेटमा संकुचित गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: विशिष्ट भ्युसेट भित्रको क्युरिले प्रयोग गर्ने प्यारामिटर मात्र परिमार्जन हुन्छ।
```text
Please adjust the QR token duration in [accounts/views.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/accounts/views.py#L870-L885).

1. Look only at lines 870 to 885.
2. Reduce the validity parameter of the generated qr_token from 30 minutes to 15 minutes in the generated payload separator.
3. One-Time Check: Run tests exactly once. If fails, report error directly.
```

---

### 📊 Category 2: Finance & Accounting Module (`fin/`) (५ प्रम्प्टहरू)

#### ६. Ledger मा ऋणात्मक ब्यालेन्स हुँदा चेतावनी दिन (Ledger Balance Negative Warning)
* **परिभाषा (Definition)**: बजेट वा खातामा पैसा नहुँदा खाता ऋणात्मक दिशामा जान नदिन डेटाबेस मोडेलको स्तरमै भ्यालिडेसन एरर थप्दछ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: मोडेल फाइलमा केवल एउटा भ्यालिडेटर विधि मात्र थपिन्छ।
```text
Please modify ledger balance validation in [fin/models.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/fin/models.py#L112-L125).

1. Inspect lines 112 to 125.
2. Raise a validation error with the message "Warning: Ledger balance cannot go below zero" if balance < 0.
3. Apply surgically. One-time syntax check only.
```

#### ७. बिल मितिको ढाँचा परिवर्तन गर्न (Format Billing Date Output)
* **परिभाषा (Definition)**: फ्रन्टइन्डमा रसिदहरू वा बिलको म्याद सही देखियोस् भन्नका लागि सिरियलाइजरमा मितिको आउटपुट ढाँचा (YYYY-MM-DD) बनाउँदछ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: सिरियलाइजरको फिल्ड रिप्रिजेन्टेसनमा १० लाइन मात्र परिवर्तन गरिन्छ।
```text
Please update the date representation in [fin/serializers.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/fin/serializers.py#L65-L75).

1. Inspect lines 65 to 75.
2. Format `due_date` field output to ISO format (YYYY-MM-DD) in the serializer representation.
3. One-Time Check: Run Django check. If failure, do not self-correct; stop immediately.
```

#### ८. ट्रान्सफर गर्दा पैसाको अंक राउण्ड अप गर्न (Round Up Credit Values in Transfers)
* **परिभाषा (Definition)**: कोष स्थानान्तरण (Money Transfer) गर्दा पैसाको दशमलव अंक धेरै लामो नजाओस् भन्नका लागि २ दशमलव स्थानमा राउण्ड गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: भ्युसेटको सेभ हुकको सानो कोड खण्ड मात्र परिमार्जन हुन्छ।
```text
Please modify transaction calculations inside [fin/views.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/fin/views.py#L140-L150).

1. Read lines 140 to 150 only.
2. Round all transfer amounts to 2 decimal places using Python's round() function before saving.
3. Replace surgically. One-time syntax check only.
```

#### ९. चालु आर्थिक वर्ष अनुसार ट्रान्सफर फिल्टर गर्न (Filter Transfers by Current Financial Year)
* **परिभाषा (Definition)**: पुराना वर्षहरूको आर्थिक रेकर्डहरू थुपारेर लोड बढाउनुको सट्टा क्युरीमा केवल चालु आर्थिक वर्षका डाटा मात्र तान्ने फिल्टर थप्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: भ्युसेटको क्युरीसेट कन्फिगरेसन मात्र संशोधन गरिन्छ।
```text
Please modify query logic in [fin/views.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/fin/views.py#L205-L215).

1. View lines 205 to 215.
2. Filter the queryset to only fetch transfers where `created_at` belongs to the current Nepali fiscal year.
3. Apply changes and do a single compilation check.
```

#### १०. फ्रन्टइन्ड रिपोर्टमा मुद्राको चिन्ह (Rs.) परिवर्तन गर्न (Update Currency Symbol in Report UI)
* **परिभाषा (Definition)**: नेपाली प्रयोगकर्ताहरूलाई सहज बनाउन डलर चिन्ह ($) लाई नेपाली रुपैयाँ (Rs.) मा प्रतिस्थापन गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: सिधै JSX को १० लाइन भित्रको स्ट्रिङ रिप्लेस गरिन्छ।
```text
Please update the currency formatting in [ReportDashboard.jsx](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/frontend/src/components/finance/ReportDashboard.jsx#L45-L55).

1. Inspect lines 45 to 55.
2. Change the hardcoded currency string from "$" to "Rs.".
3. Do not scan other folders. Perform a single build verify. If error, stop.
```

---

### 📦 Category 3: Resource & Inventory (`resource/`) (५ प्रम्प्टहरू)

#### ११. सक्रिय सामग्रीको मूल्य मात्र देखाउन (Restrict Supplier Rate Query to Active Materials)
* **परिभाषा (Definition)**: निष्क्रिय भइसकेका वा खारेज भएका निर्माण सामग्रीहरूको दररेट नदेखियोस् भन्न क्युरीसेटमा फिल्टर थप्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: क्युरी फिल्टरमा केवल एउटा सानो `.filter()` कमाण्ड थपिन्छ।
```text
Please modify stock filtering in [resource/views.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/resource/views.py#L78-L90).

1. Inspect lines 78 to 90.
2. Add a queryset filter to only retrieve supplier rates where `material.is_active` is True.
3. One-Time Check: Compile test once. Stop if it fails.
```

#### १२. अर्डर फाइनल भएपछि मात्र स्टक बढाउन (Increment Stock on Finalized Purchase Order)
* **परिभाषा (Definition)**: सामान माग अर्डर स्वीकृत भई वास्तविक सामान रिसिभ (Received) भएपछि मात्र सामग्री गोदामको स्टक थपिने सुनिश्चित गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: मोडेलको स्थिति परिवर्तन हुने सानो ब्लक मात्र खोलिन्छ।
```text
Please edit status transition in [resource/models.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/resource/models.py#L160-L175).

1. View lines 160 to 175 only.
2. Only call `increment_stock_level` if the purchase status changes to "RECEIVED".
3. Apply surgically. Do not check outer files. One-time syntax validation.
```

#### १३. उपकरणको मौज्दात स्थिति फिल्टर गर्न (Filter Equipment List by Availability)
* **परिभाषा (Definition)**: निर्माण साइटमा उपलव्ध नभएका वा बिग्रिएका औजारहरूको सूची हटाउन क्युरी स्तरमा उपलब्ध फिल्टर थप्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: सिरियलाइजर भ्युसेटको सानो खण्ड मात्र परिमार्जन हुन्छ।
```text
Please adjust equipment serializer queryset in [resource/views.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/resource/views.py#L220-L230).

1. Inspect lines 220 to 230.
2. Default the listing endpoint filter to only return equipment where `is_available` is True.
3. Verify once, do not auto-retry.
```

#### १४. निर्माण सामग्री खेर जाने चेतावनी सीमा तोक्न (Add Material Waste Alert Threshold)
* **परिभाषा (Definition)**: साइटमा सामग्री खेर जाने (Wastage) दर १५% भन्दा माथि पुगेमा व्यवस्थापकलाई सचेत गराउन लग वा अलर्ट थप्दछ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: मोडेल क्लिन फंक्शनमा सानो इफ कन्डिसन थपिन्छ।
```text
Please add a boundary check in [resource/models.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/resource/models.py#L92-L105).

1. Read lines 92 to 105.
2. If `wastage_percentage` exceeds 15%, log a warning message to standard app logs.
3. One-Time Check: Run Django check once. Report success or failure directly.
```

#### १५. सामग्री माग सम्बन्धी PDF को शीर्षक परिवर्तन गर्न (Format Purchase Requisition PDF Title)
* **परिभाषा (Definition)**: रिपोर्टिङ स्तरीय बनाउन सामग्री खरिद माग गर्दा प्रिन्ट हुने PDF शीर्षक आधिकारिक ढाँचामा परिमार्जन गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: युटिलिटी भित्रका शीर्षक सेट गर्ने स्ट्रिङ परिवर्तन गरिन्छ।
```text
Please update the PDF generation title in [resource/utils.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/resource/utils.py#L40-L50).

1. Inspect lines 40 to 50.
2. Change the PDF document header title from "REQ - Order" to "Construction Requisition Report".
3. Run one compilation check. Do not loop.
```

---

### ⏰ Category 4: Attendance & Workforce (५ प्रम्प्टहरू)

#### १६. RFID ब्याज नम्बरको लम्बाई जाँच गर्न (Validate RFID Badge Number Length)
* **परिभाषा (Definition)**: कामदारहरूको अन-साइट NFC/RFID कार्ड नम्बर स्क्यान गर्दा कार्डको नम्बर ठ्याक्कै १० अंकको हुनुपर्ने नियम मोडेलमा लागू गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: डाटाबेस मोडेलको फिल्ड भ्यालिडेशनको सानो खण्ड मात्र संशोधन गरिन्छ।
```text
Please check character constraints in [workforce/models.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/workforce/models.py#L75-L85).

1. Inspect lines 75 to 85.
2. Add a Clean method validation ensuring the `rfid_card_number` is exactly 10 characters long.
3. Replace surgically. Single validation check only.
```

#### १७. MQTT हाजिरी पिङमा आउने अपवादहरू लग गर्न (Log MQTT Attendance Ping Exceptions)
* **परिभाषा (Definition)**: IoT हाजिरी मेसिनबाट क kiosk मार्फत MQTT सन्देश पठाउँदा नेटवर्क अवरुद्ध भई आउने त्रुटि सुरक्षित तरिकाले प्रणाली लगमा रेकर्ड गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: MQTT को ह्यान्डलर ब्लक मात्र खोलिन्छ।
```text
Please wrap connection blocks in try-except inside [attendance/mqtt_client.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/attendance/mqtt_client.py#L55-L68).

1. View lines 55 to 68 only.
2. Catch `paho.mqtt.MQTTException` and log it using `logger.error` with localized context.
3. Run one syntax check. Stop on errors.
```

#### १८. कामदारको नाम स्वतः ठूलो अक्षर बनाउन (Auto-Capitalize Member Names)
* **परिभाषा (Definition)**: रिपोर्ट र कागजातमा नाम राम्रो देखियोस् भन्नका लागि डाटाबेसमा सेभ हुनु अगाडि पहिलो र अन्तिम नाम स्वतः क्यापिटलाइज गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: मोडेल सेभ ओभरराइड विधि मात्र परिमार्जन हुन्छ।
```text
Please update save hooks in [workforce/models.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/workforce/models.py#L120-L130).

1. View lines 120 to 130 only.
2. Force `first_name` and `last_name` fields to be saved as title case (capitalized first letters).
3. Do a single database migration dry-run check.
```

#### १९. तलब हिसाब गर्दा पैसा राउण्ड अप गर्न (Round Payroll Calculations)
* **परिभाषा (Definition)**: ज्याला तथा पेरोल गणना गर्दा पैसा खुद्रा वा पैसाको धेरै दशमलव अंकमा आउनुको सट्टा पूर्णांक (integer) मा परिवर्तन गर्दछ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: पेरोल गणना गर्ने सर्भिस विधिको सानो खण्ड मात्र परिमार्जन हुन्छ।
```text
Please adjust calculation logic in [workforce/services.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/workforce/services.py#L102-L115).

1. Inspect lines 102 to 115.
2. Round final payroll payouts to the nearest integer value before returning.
3. Check code syntax once. Do not loop.
```

#### २०. QR स्क्यान गर्ने म्याद सकिएको जाँच गर्न (Check Kiosk QR Code Expiration)
* **परिभाषा (Definition)**: कुनै कामदारले पुरानो क्युआर स्क्रिनसट प्रयोग गरी कीर्ते हाजिरी गर्न नपाओस् भन्न क्युआर जेनेरेट भएको ५ मिनेट नाघेको छ भने अस्वीकार गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: क्युआर भ्यालिडेटर भ्युसेटको सानो भ्यालिडेसन खण्ड मात्र खोलिन्छ।
```text
Please update QR code validator inside [attendance/views.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/attendance/views.py#L140-L152).

1. View lines 140 to 152 only.
2. Return a 403 Forbidden response if the decrypted timestamp in the QR request is older than 5 minutes.
3. One-Time Check: Run tests once. If fails, do not loop.
```

---

### 📷 Category 5: Photo Intelligence (`photo_intel/`) (३ प्रम्प्टहरू)

#### २१. Vision API बिग्रेमा पुरानो तरिकाबाट विश्लेषण गर्न (Set Fallback to Heuristic Photo Analysis)
* **परिभाषा (Definition)**: क्लाउड भिजन API नेटवर्क वा कोटा समस्याका कारण चल्न नसकेमा साइटको फोटो विश्लेषण कार्य अवरुद्ध हुन नदिन लोकल विश्लेषण विधि लागू गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: सर्भिस फाइलको ट्राइ-क्याच ब्लक मात्र खोलिन्छ।
```text
Please edit analysis logic in [photo_intel/services.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/photo_intel/services.py#L65-L78).

1. Read lines 65 to 78 only.
2. Add a fallback logic inside the try block to run `heuristic_analysis()` if the `Google Vision API` call raises an exception.
3. Verify once. Stop and ask if imports are missing.
```

#### २२. टाइमल्याप्स रिपोर्टलाई ५ हप्तामा सिमित गर्न (Limit Weekly Timelapse Digest Scope)
* **परिभाषा (Definition)**: फ्रन्टइन्डको टाइमल्याप्स ग्यालेरी लोड हुँदा सयौं पुराना फोटो टाइमल्याप्स रेकर्ड तान्नुको सट्टा पछिल्लो ५ हप्ताको रेकर्डमा सीमित गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: क्युरी स्लाइस प्यारामिटर मात्र परिमार्जन गरिन्छ।
```text
Please modify timeline query inside [photo_intel/views.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/photo_intel/views.py#L110-L120).

1. Read lines 110 to 120.
2. Change the queryset slice so it returns only the 5 most recent weekly timeline records.
3. Check compilation once.
```

#### २३. फोटो नमिल्दा फ्रन्टइन्डमा चेतावनी पपअप देखाउन (Add Warning Alert on Photo Mismatch)
* **परिभाषा (Definition)**: एआई फोटो विश्लेषण गर्दा काम नमिल्ने (Mismatch) देखिएमा ग्यालेरी स्क्रिनमा नै रातो रङको चेतावनी अलर्ट देखाउन सहयोग गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: केवल JSX को स्टेट कन्ट्रोल मात्र परिमार्जन गरिन्छ।
```text
Please adjust state alert in [TimelapseGallery.jsx](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/frontend/src/components/photo_intel/TimelapseGallery.jsx#L85-L95).

1. Inspect lines 85 to 95 only.
2. Show a red warning toast if `photoMatch` status is 'MISMATCH'.
3. Run build once. If errors, do not retry automatically.
```

---

### 📄 Category 6: Permits Module (३ प्रम्प्टहरू)

#### २४. डकुमेन्ट अपलोड साइज १० एमबीमा सिमित गर्न (Enforce 10MB Permit Upload Size Limit)
* **परिभाषा (Definition)**: सरकारी अनुमति पत्र वा इजाजत पत्र अपलोड गर्दा सर्भरको स्पेस सुरक्षित राख्न फाइलको साइज १० एमबीभन्दा बढी हुन दिँदैन।
* **टोकन बचत रणनीति (Token Saving Strategy)**: सिरियलाइजर भ्यालिडेटर विधि मात्र संशोधन हुन्छ।
```text
Please check document file size in [permits/serializers.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/permits/serializers.py#L50-L62).

1. View lines 50 to 62 only.
2. If `document_file.size` exceeds 10 * 1024 * 1024 bytes, raise a ValidationError("File size exceeds 10MB").
3. Perform a single code compile check.
```

#### २५. सुरुमा अनुमति स्थिति 'PENDING' राख्न (Set Default Permit Status to PENDING)
* **परिभाषा (Definition)**: अनुमति पत्र नयाँ पेश गर्दा यसको डिफल स्वीकृत अवस्था स्वतः 'PENDING' रहने सुनिश्चित गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: मोडेल फाइल भित्रको फिल्डको डिफल प्यारामिटर मात्र बदलिन्छ।
```text
Please modify state default in [permits/models.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/permits/models.py#L30-L38).

1. Read lines 30 to 38.
2. Ensure the `status` field choices default value is set to 'PENDING'.
3. Apply surgically. One-time syntax check only.
```

#### २६. अनुमति फारम बुझाउने बटनको चौडाई मिलाउन (Change Layout Width of Submit Button)
* **परिभाषा (Definition)**: मोबाइल स्क्रिनमा सजिलोका लागि स्वीकृत पेश गर्ने बटनलाई सानोबाट तानेर फुल-विड्थ (w-full) बनाउँदछ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: सानो क्लास स्ट्रिङ मात्र फेरिन्छ।
```text
Please update the submit button CSS in [PermitWizard.jsx](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/frontend/src/components/permits/PermitWizard.jsx#L140-L150).

1. Inspect lines 140 to 150 only.
2. Change className tailwind utility from `w-1/2` to `w-full`.
3. Verify the build once. Do not loop.
```

---

### 📱 Category 7: Mobile App / React Native Layer (४ प्रम्प्टहरू)

#### २७. मोबाइल एपको API Base URL परिवर्तन गर्न (Update Mobile API Base URL)
* **परिभाषा (Definition)**: मोबाइल एपलाई लोकल डेभलपमेन्ट सर्भर (जस्तै: `http://192.168.1.100:8000/api/v1`) वा स्टिजिङ सर्भरमा कनेक्ट गराउन API base URL परिमार्जन गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: सर्भिस फाइलको सुरुआती प्यारामिटर खण्ड (लाइन ४) मात्र संपादन गरिन्छ।
```text
Please change the API_BASE_URL variables inside [api.js](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/mobile-app/src/services/api.js#L4-L8).

1. Inspect lines 4 to 8 only.
2. Update the default API_BASE_URL string to 'http://192.168.1.100:8000/api/v1'.
3. One-Time Check: Run compilation once. Do not auto-correct on failure.
```

#### २८. लगइन गर्दा घुम्ने लोडिङ आइकनको रङ सेतो बनाउन (Change Spinner Color)
* **परिभाषा (Definition)**: गाढा पृष्ठभूमिमा लोड गर्दा घुम्ने आइकन प्रष्ट देखियोस् भन्नका लागि यसको रङ सेतोमा परिमार्जन गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: कम्पोनेन्ट ट्यागको एउटा प्रोप (prop) मात्र परिवर्तन हुन्छ।
```text
Please edit components style in [LoginScreen.jsx](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/mobile-app/src/screens/LoginScreen.jsx#L85-L95).

1. View lines 85 to 95.
2. Change the `<ActivityIndicator>` component's color prop to `#ffffff`.
3. Compile verification once. If error, stop.
```

#### २९. सुरक्षित मोबाइल स्टोरेजबाट पिन कोड तान्न (Read Phone PIN Securely)
* **परिभाषा (Definition)**: टोकन सकिएमा मोबाइल एपले प्रयोगकर्तालाई पुनः लगइन सोध्नुको सट्टा डिभाइसमा सेभ भएको टोकन तान्ने वैकल्पिक व्यवस्था गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: मोबाइल सर्भिस फाइलको ट्राइ ब्लक खण्ड मात्र संशोधन गरिन्छ।
```text
Please adjust credentials retrieval in [api.js](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/mobile-app/src/services/api.js#L35-L45).

1. Read lines 35 to 45.
2. Add a fallback logic: if the direct memory token fails, attempt reading the refresh token from `storage.getItem('refresh_token')`.
3. Apply surgically. Do not review native platform code.
```

#### ३०. इन्टरनेट जोडिएको स्थिति मोबाइलमा देखाउन (Add Simple Internet Connection Status Indicator)
* **परिभाषा (Definition)**: मोबाइल हराएको वा अफलाइन भएको बेला डेटा हराउन नदिन माथि एउटा पातलो रातो अफलाइन ब्यानर थप्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: एपको मूल फाइलमा १० लाइन मात्र थपिन्छ।
```text
Please update status view inside [App.js](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/mobile-app/App.js#L40-L50).

1. Look only at lines 40 to 50.
2. If `isConnected` variable is false, display a thin red alert banner at the top saying "Offline Mode Active".
3. Check code syntax exactly once.
```

---

### 🛠️ Category 8: DevOps, Scripts & Docker Configurations (३ प्रम्प्टहरू)

#### ३१. MQTT ब्रोकर कन्टेनर सधैं आफैं सुरु हुने बनाउन (Set MQTT Broker Restart Policy)
* **परिभाषा (Definition)**: लोकल डेभलपमेन्टको समयमा कम्प्युटर रिबुट वा डकर रिस्टार्ट हुँदा Mosquitto MQTT ब्रोकर कन्टेनर स्वतः उठ्ने नीति कन्फिगर गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: डकर-कम्पोजको ११ लाइन मात्र पढिन्छ।
```text
Please adjust docker compose definitions in [docker-compose.dev.yml](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/docker-compose.dev.yml#L52-L62).

1. Inspect lines 52 to 62.
2. Set the `restart` attribute of the `mosquitto` service container to `always`.
3. Verify configuration syntax exactly once. Stop and ask if verification fails.
```

#### ३२. डाटाबेस ब्याकअप राख्ने फोल्डर बदल्न (Change Database Backup Path in Script)
* **परिभाषा (Definition)**: लोकल डाटाबेस रिसेट गर्दा सुरक्षित ब्याकअप राख्ने अस्थायी डाइरेक्टरी स्थान परिवर्तन गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: बास स्क्रिप्टको सुरुआती प्यारामिटर खण्ड मात्र सम्पादन हुन्छ।
```text
Please adjust environment values in [reset_local_db.sh](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/scripts/reset_local_db.sh#L15-L25).

1. Read lines 15 to 25.
2. Change the BACKUP_DIR local variable destination path from `/tmp/backups/` to `./scratch/db_backups/`.
3. Apply change surgically using replace_file_content.
```

#### ३३. मोक टेष्टिङका लागि नयाँ इन्भाइरोमेन्ट फ्ल्याग थप्न (Add Offline Testing Environment Variable)
* **परिभाषा (Definition)**: विकासकर्ताहरूलाई अफलाइन कन्डिसनमा नक्कली डाटाहरू प्रयोग गरेर परीक्षण गर्न इन्भाइरोमेन्ट फाइलमा नयाँ कन्फिगरेसन भेरिएबल थप्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: कन्फिगरेसन गाइडलाइनको ८ लाइन मात्र खोलिन्छ।
```text
Please add a new variable to [.env.example](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/.env.example#L30-L38).

1. View lines 30 to 38 only.
2. Add `TESTING_OFFLINE_MODE=True` with a comment explaining it enables heuristic fallbacks locally.
3. One-Time Check: Run syntax validation. Report back immediately on success.
```

---

### 🐙 Category 9: Git Management & Branching (१० प्रम्प्टहरू)

#### ३४. निश्चित संशोधित फाइलहरू मात्र स्टेज गर्न (Stage Specific Modified Files Only)
* **परिभाषा (Definition)**: अनाधिकृत बिल्ड फाइल वा ठूला SQL डम्पहरू गल्तीले स्टेज हुन नदिन केवल आवश्यक कोड फाइल मात्र गिट इन्डेक्समा स्टेज गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: `git add .` को सट्टा विशिष्ट फाइल पाथहरू प्रयोग गरेर टोकन र गल्तीहरू बचाउँछ।
```text
Stage only the modified backend settings file to git.

1. Stage exactly [settings.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/config/settings.py).
2. Do not stage any other modified or untracked database files in the repository.
3. One-Time Check: Verify the staged status once using git status. Report results directly.
```

#### ३५. गिट स्थिति छोटोमा हेर्न (View Git Status Short Summary)
* **परिभाषा (Definition)**: गिट स्टेटस जाँच गर्दा अनावश्यक लामो आउटपुट रोक्न संक्षिप्त र ट्र्याक नगरिएका फाइलहरूको छोटो सूची मात्र देखाउँछ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: लामो गिट स्टेटस वर्णनको सट्टा `-s` फ्ल्याग प्रयोग गर्दा ८०% भन्दा बढी इनपुट टोकन बचत हुन्छ।
```text
Show a highly condensed status of the repository files.

1. Run exactly `git status -s`.
2. Do not output verbose branch instructions or untracked help text.
3. One-Time Check: Report the brief file list immediately.
```

#### ३६. निश्चित मोड्युल उल्लेख गरी सफा कमिट गर्न (Commit Staged Changes with Specific Scoped Prefix)
* **परिभाषा (Definition)**: इतिहास स्पष्ट राख्न र कन्फ्लिक्टहरू ट्र्याक गर्न कमिट मेसेजमा नै कुन मोड्युल (जस्तै `[accounts]`) मा काम गरिएको हो, त्यो स्पष्ट लेख्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: साना र स्पष्ट कमिटहरूले लुपिङ तथा मर्ज कन्फ्लिक्टहरूको सम्भावना शून्य बनाउँछ।
```text
Commit the staged code with a concise and scoped message.

1. Create a commit with message format: "feat(accounts): add negative balance validator to ledger".
2. Ensure you do not add or stage any other files.
3. One-Time Check: Commit once and return the commit hash immediately.
```

#### ३७. हालको ब्रान्च सुरक्षित तरिकाले पुश गर्न (Push Current Branch Safely)
* **परिभाषा (Definition)**: सर्भरमा गलत ब्रान्च वा अनाधिकृत डेटा पुश हुनबाट जोगाउन हाल सक्रिय ब्रान्चको गन्तव्य तोकेर सुरक्षित पुश गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: एजेन्टले बारम्बार पुल/पुश लुप चलाउन पाउँदैन।
```text
Push the current local branch to the origin repository safely.

1. Run exactly `git push origin HEAD` or specify the active branch tracking.
2. One-Time Check: Run push exactly once. If a conflict or credential error is hit, stop and report back immediately. Do not loop.
```

#### ३८. नयाँ कामको लागि छुट्टै ब्रान्च बनाउन (Create a Task-Specific Local Branch)
* **परिभाषा (Definition)**: मुख्य ब्रान्चलाई सुरक्षित राख्न र छुट्टै फिचरमा काम गर्न कार्य-विशिष्ट ब्रान्च (जस्तै `feat/attendance-validator`) बनाउँछ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: कामलाई टुक्राउँदा एउटा च्याटमा धेरै कोड परिवर्तन हुँदैन र टोकन बच्छ।
```text
Create and checkout a new local development branch for attendance refactoring.

1. Run exactly `git checkout -b feat/attendance-validator`.
2. Ensure you branch off from the latest clean main branch.
3. One-Time Check: Confirm branch creation once and report current branch name.
```

#### ३९. मेन ब्रान्चबाट पुल र सुरक्षित रिबेस गर्न (Fetch and Rebase Safely)
* **परिभाषा (Definition)**: अरु विकासकर्ताहरूले गरेका कामहरू आफ्नो लोकल ब्रान्चमा ल्याएर कोडलाई गिट इतिहास अनुसार मिलाउँछ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: गिट कन्फ्लिक्ट लुपहरू रोक्न एक पटक मात्र कमाण्ड रन गरिन्छ।
```text
Update the active branch with the latest changes from main branch via rebase.

1. Fetch latest changes using `git fetch origin`.
2. Run `git rebase origin/main`.
3. One-Time Check: If a rebase conflict occurs, stop immediately and report the conflicting files. Do not run git rebase --continue automatically.
```

#### ४०. भर्खरैका कमिटहरू सीमित गरी हेर्न (View Recent Commits with Strict Limit)
* **परिभाषा (Definition)**: गिट कमिट लगहरूको लामो फेहरिस्त च्याटमा लोड गर्नुको सट्टा पछिल्लो ५ वटा मुख्य कमिटहरूको छोटो सूची मात्र तान्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: पूरै गिट लग तान्दा हजारौं टोकन बर्बाद हुनबाट रोक्न `-n 5 --oneline` तोकिन्छ।
```text
Retrieve the last 5 commits from the repository history.

1. Run exactly `git log -n 5 --oneline`.
2. Do not print full author emails, commit bodies, or deep diff histories.
3. One-Time Check: Output the 5 lines immediately and stop.
```

#### ४१. काम नसकिएको कोड सुरक्षित लुकाउन (Stash Changes Before Branch Switching)
* **परिभाषा (Definition)**: काम नसकिएको वा अपुरो कोडलाई सुरक्षित राखेर अर्को ब्रान्चमा जान आफ्नो हालको परिवर्तनहरूलाई गिट स्ट्यासमा राख्दछ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: आधा-अधुरो कोड हराएर फेरि लेख्नु पर्ने र टोकन दोहोरिने समस्या कम गर्छ।
```text
Stash all modified local files safely.

1. Run exactly `git stash save "WIP: resource validation logic"`.
2. Ensure untracked files are kept clean.
3. One-Time Check: Confirm stash success and print `git stash list` strictly showing the top 1 item.
```

#### ४२. निश्चित फाइलमा गरिएका काम रद्द गर्न (Discard Changes in a Single Specific File)
* **परिभाषा (Definition)**: परीक्षणका क्रममा बिग्रेको निश्चित फाइलको कोडलाई पुरानो सफा अवस्थामा (Discard changes) फर्काउँछ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: पूरै प्रोजेक्ट रिसेट गर्नुको सट्टा केवल एउटा फाइल मात्र गिट चेकआउट गरिन्छ।
```text
Discard local modifications in a single specific file to restore its default state.

1. Run exactly `git checkout -- backend/config/settings.py`.
2. Do not touch or modify other files or perform a hard reset on the whole branch.
3. One-Time Check: Confirm the file restoration status once.
```

#### ४३. मर्ज कन्फ्लिक्ट मात्र पत्ता लगाउन (Locate Merge Conflicts in a Specific File)
* **परिभाषा (Definition)**: कोड मर्ज गर्दा आएको कन्फ्लिक्ट (द्वन्द्व) फाइल भित्र कहाँ छ भनी गिट मार्करहरू (`<<<<<<<`, `=======`, `>>>>>>>`) सर्च गर्छ।
* **टोकन बचत रणनीति (Token Saving Strategy)**: पूरै फाइल पुन: पढ्नुको सट्टा द्वन्द्व भएको लाइन मात्रै सिधै फेला पार्दा टोकन खेर जाँदैन।
```text
Locate merge conflict markers in the modified file.

1. Run a targeted search for conflict markers `<<<<<<<` inside [settings.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/config/settings.py).
2. Report the line numbers immediately.
3. One-Time Check: Do not attempt to solve the conflict; just output the lines.
```
