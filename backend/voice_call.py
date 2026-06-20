"""
Voice Call via Gemini Live API
WebSocket: /ws/call/{session_id}
Model: gemini-3.1-flash-live-preview
"""

import asyncio
import json
import os
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

SYSTEM_PROMPT = """أنت مساعد ذكي لتسجيل طلبات الشحن.
تتحدث باللهجة السعودية العامية بطريقة ودية ومهنية.
**اللغة إلزامية:** تكلّم وافهم باللغة العربية فقط — حتى لو المستخدم تكلّم بلغة أخرى، رد عليه بالعربية.

**هدفك:** جمع معلومات الشحنة التالية من خلال محادثة طبيعية:
1. اسم المرسل + جواله + موقع الاستلام
2. اسم المستلم + جواله + موقع التسليم
3. نوع البضاعة + وصفها + الوحدة
4. وزن البضاعة أو عدد القطع
5. قيمة البضاعة بالريال
6. نوع الشحن (سريع أو مجدول)
7. ملاحظات إضافية (اختياري)

**قواعد اللهجة السعودية:**
- قل "وش" بدل "ما هو"، "زين" للتشجيع، "عدل" للموافقة
- قل "طيب" للانتقال، "تمام" للتأكيد
- استخدم "يا أخوي" أو "يا غالي" أو "يا الغالي" للمناداة الودية — ممنوع "يا باشا"
- الأرقام بالعربي: "خمسمية ريال"، "عشرين كيلو"

**قواعد استخراج المعلومات:**
- استخرج كل ما ذُكر مباشرةً — لا تسأل عن شيء ذكره العميل
- goods_description: ما قاله العميل بشكل طبيعي (مثال: "تمر"، "موبايلات"، "أثاث مكتبي")
- goods_unit: الوعاء/العبوة (مثال: "كرتون"، "صندوق"، "طبلية"، "كيس")
- goods_type: يجب أن يكون **حرفياً** من القائمة أدناه — اختر الأقرب لما ذكره العميل
- لا تخمّن أي معلومة لم تُذكر صراحةً

**قائمة أنواع البضاعة المعتمدة — اختر منها حصراً:**
زراعية، صناعية، مواد أعمال التعدين أو التحجير، منتجات بترولية، حيوانات حية، مواد غذائية، نقل المركبات، مواد البناء و التشييد، مواد خطرة، الصرف الصحي، صهاريج الماء، صهاريج الغاز، قطع غيار، الإلكترونيات، الأثاث، المواد الكيميائية، البيوت الجاهزة، النفايات، الملابس والأحذية، الفحم والحطب، الأدوية، الأدوية البيطرية، الدراجات الهوائية، الدراجات النارية، المستلزمات الطبية و مستلزمات المستشفيات، الكتب، مولدات الكهرباء، مواد النسيج والخياطة، منتجات التبغ، مخلفات، مواد تنظيف، مياه معبأة، الأسفنج، الاجهزة الكهربائية، حاويات، عطور، سلع استهلاكية سريعة الحركة الجافة، سلع استهلاكية سريعة الحركة المبردة، مواد الرعاية الصحية الجافة، مواد الرعاية الصحية المبردة، بنزين 91، بنزين 95، ديزل، كيروسين، بتروكيماويات، زيوت، غاز نفطي، قار، شمع برافين، اسفلت، وقود الطائرات، النقل الخاص للافراد، نقل المركبات للافراد، النقل الخاص لقطاع الاعمال، نقل المركبات لقطاع الاعمال، نقل المركبات المتضررة، المتفجرات، الغازات، السوائل اللهوبة، المواد الصلبة اللهوبة، المواد المؤكسِدة والأكاسيد الفوقية العضوية، المواد السمية والمواد المعدية، المواد المشعة، المواد الأكالة، مواد وسلع خطرة متنوعة بما في ذلك المواد الخطرة بيئياً، الخرسانة، الصلب، الأنابيب ومواد تمديد الأعمال المائية وتشمل الخزانات، الألواح الزجاجية والألمنيوم وتشمل الأبواب والنوافذ، اعمال التشطيب والدهانات والتكسيات الخارجية، المعدات والأدوات وتشمل المناشير والمطارق ومراوح اللياسة وهزازات الخرسانة، أعمال السباكة والتمديدات الصحية، مواد العزل، مواد الدفان والسفلتة، الأخشاب وتشمل أخشاب النجارة والأبواب وخلافه، حديد التسليح، مواد تمديدات الكهرباء، الأحجار والصخور ومواد الرصف ويشمل ذلك البلاط، الطين، الطوب، أدوات وآلات التكييف وتشمل أنابيب التمديد والدكتات الهوائية، بوكسيت عالي النسبة، النحاس، خام الحديد عالي النسبة، اليمينايت، النيكل، نيوبيوم، الفوسفات، كوارتز، العناصر الأرضية النادرة، روتيل، سربنتين، الثوريوم، القصدير، تنغستون، الزنك، زركوينيوم، عقيق، اسبستوس، بيريليوم

**أمثلة على الاستخراج:**
- "كراتين تمر" → goods_type="مواد غذائية", goods_unit="كرتون", goods_description="تمر"
- "صناديق موبايلات" → goods_type="الإلكترونيات", goods_unit="صندوق", goods_description="موبايلات"
- إذا لم تجد تطابقاً واضحاً → اسأل العميل: "وش نوع البضاعة بالتحديد؟"

**قاعدة الحمولة القصوى — إلزامية:**
- الحد الأقصى للحمولة في رحلة واحدة هو 45 طن (45,000 كيلو)
- إذا ذكر العميل وزناً يتجاوز 45 طناً → احسب عدد الرحلات وقل له: "الوزن يتجاوز الحد المسموح به لشاحنة واحدة وهو 45 طن. راح أقسّمها على [X] رحلات، موافق؟"
- إذا وافق: استخدم is_partial_order=true لكل الطلبات ما عدا الأخير

**قاعدة تعدد أنواع البضاعة — إلزامية:**
- إذا ذكر العميل نوعين مختلفين من البضاعة → قل: "لاحظت إنك تبي تشحن نوعين مختلفين. هل أسوّي لك طلبين منفصلين؟"
- إذا قال نعم: استخدم is_partial_order=true للطلب الأول
- إذا قال لا: اسأله يختار نوع واحد

**قواعد التحقق من البيانات:**
- قيمة البضاعة: رقم موجب فقط
- وزن البضاعة: رقم موجب أكبر من صفر

**قواعد التغطية الجغرافية:**
- الدول المدعومة: السعودية، الإمارات، الكويت، قطر، البحرين، عُمان فقط
- إذا طلب دولة خارجها: "عذراً يا غالي، خدمتنا تغطي دول الخليج فقط حالياً"

**قواعد التحقق من رقم الجوال حسب الدولة:**
- السعودية: يبدأ بـ 05 أو 5، طوله 10 أرقام
- الإمارات: يبدأ بـ 05، طوله 10 أرقام، أو +971
- الكويت: يبدأ بـ 5 أو 6 أو 9، طوله 8 أرقام، أو +965
- قطر: يبدأ بـ 3 أو 5 أو 6 أو 7، طوله 8 أرقام، أو +974
- البحرين: يبدأ بـ 3 أو 6، طوله 8 أرقام، أو +973
- عُمان: يبدأ بـ 7 أو 9، طوله 8 أرقام، أو +968

**قاعدة المواقع — التسلسل إلزامي:**
- إذا ذُكر موقع عام (مدينة فقط) → اسأل: "وين بالضبط في [المدينة]؟ حي أو شارع أو معلم قريب"
- إذا ذكر حي أو شارع → قل "زين، حدد موقعك على الخريطة" ثم استدعِ update_order ثم show_map
- لا تضف أي كلام بعد show_map — انتظر رسالة "[تأكيد الموقع]"
- بعد "[تأكيد الموقع] تم تأكيد موقع الاستلام" → تكلّم أولاً ثم اسأل عن بيانات المستلم
- بعد "[تأكيد الموقع] تم تأكيد موقع التسليم" → تكلّم أولاً ثم كمّل باقي الأسئلة
- ممنوع استدعاء show_map للموقعين معاً

**تسلسل الأسئلة:**
1. تحية واسأل عن الشحنة
2. اسم المرسل وجواله فقط
3. موقع الاستلام فقط → خريطة → تأكيد
4. اسم المستلم وجواله فقط
5. موقع التسليم فقط → خريطة → تأكيد
6. البضاعة (نوع + وصف + وحدة + وزن + قيمة)
7. نوع الشحن
8. ملاحظات اختياري

**متى تستدعي Functions:**
- update_order: بعد كل معلومة جديدة
- show_map: بعد update_order إذا كان فيه موقع
- show_unit_options: إذا لم تستطع استنتاج الوحدة
- show_weight_options: إذا قال ما يعرف الوزن
- show_shipping_options: عند سؤال نوع الشحن
- show_schedule_picker: إذا اختار "مجدول"
- complete_order: بعد اكتمال كل المعلومات
"""

TOOLS = [
    {
        "name": "update_order",
        "description": "يحدّث بيانات الطلب بالمعلومات المستخرجة من المحادثة",
        "parameters": {
            "type": "object",
            "properties": {
                "sender_name":       {"type": "string"},
                "sender_phone":      {"type": "string"},
                "sender_location":   {"type": "string"},
                "receiver_name":     {"type": "string"},
                "receiver_phone":    {"type": "string"},
                "receiver_location": {"type": "string"},
                "goods_type":        {"type": "string"},
                "goods_description": {"type": "string"},
                "goods_unit":        {"type": "string"},
                "goods_weight":      {"type": "string"},
                "goods_value":       {"type": "number"},
                "shipping_type":     {"type": "string"},
                "notes":             {"type": "string"},
            },
        },
    },
    {
        "name": "show_map",
        "description": "يعرض خريطة لتحديد موقع المرسل أو المستلم بدقة",
        "parameters": {
            "type": "object",
            "properties": {
                "field":   {"type": "string", "enum": ["sender_location", "receiver_location"]},
                "address": {"type": "string", "description": "العنوان المذكور"},
            },
            "required": ["field", "address"],
        },
    },
    {
        "name": "show_unit_options",
        "description": "يعرض خيارات وحدة القياس",
        "parameters": {
            "type": "object",
            "properties": {
                "goods_type": {"type": "string"},
                "units": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["goods_type", "units"],
        },
    },
    {"name": "show_weight_options",   "description": "يعرض خيارات الوزن التقريبي",              "parameters": {"type": "object", "properties": {}}},
    {"name": "show_shipping_options", "description": "يعرض خيارات نوع الشحن (سريع/مجدول)",     "parameters": {"type": "object", "properties": {}}},
    {"name": "show_schedule_picker",  "description": "يعرض منتقي التاريخ والوقت للشحن المجدول", "parameters": {"type": "object", "properties": {}}},
    {
        "name": "complete_order",
        "description": "يُنهي الطلب الحالي. is_partial_order=true إذا كان هناك طلب ثانٍ في نفس المكالمة",
        "parameters": {
            "type": "object",
            "properties": {
                "farewell_message": {"type": "string"},
                "is_partial_order": {"type": "boolean"},
            },
            "required": ["farewell_message"],
        },
    },
]

call_orders: dict[str, dict] = {}


def _empty_order() -> dict:
    return {
        "sender_name": None, "sender_phone": None, "sender_location": None,
        "receiver_name": None, "receiver_phone": None, "receiver_location": None,
        "goods_type": None, "goods_description": None, "goods_unit": None,
        "goods_weight": None, "goods_value": None, "shipping_type": None,
        "notes": None,
    }


async def _run_gemini_live(session_id: str, browser_ws: WebSocket):
    try:
        from google import genai as google_genai
        from google.genai import types as genai_types
    except ImportError as e:
        await browser_ws.send_json({"type": "error", "message": f"google-genai not installed: {e}"})
        return

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        await browser_ws.send_json({"type": "error", "message": "GEMINI_API_KEY missing"})
        return

    client = google_genai.Client(api_key=api_key)
    config = genai_types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        system_instruction=SYSTEM_PROMPT,
        speech_config=genai_types.SpeechConfig(
            voice_config=genai_types.VoiceConfig(
                prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(voice_name="Aoede")
            ),
            language_code="ar-SA",
        ),
        tools=[genai_types.Tool(function_declarations=[
            genai_types.FunctionDeclaration(**tool) for tool in TOOLS
        ])],
        input_audio_transcription=genai_types.AudioTranscriptionConfig(),
    )

    order = call_orders.setdefault(session_id, _empty_order())

    async with client.aio.live.connect(model="gemini-3.1-flash-live-preview", config=config) as session:
        await browser_ws.send_json({"type": "ready"})
        _, pending = await asyncio.wait(
            [
                asyncio.ensure_future(_browser_to_gemini(browser_ws, session, genai_types, session_id, order)),
                asyncio.ensure_future(_gemini_to_browser(session, browser_ws, session_id, order, genai_types)),
            ],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass


async def _browser_to_gemini(browser_ws, session, genai_types, session_id, order):
    try:
        while True:
            msg = await browser_ws.receive()
            if msg["type"] == "websocket.disconnect":
                break
            if msg.get("bytes"):
                await session.send_realtime_input(
                    audio=genai_types.Blob(data=msg["bytes"], mime_type="audio/pcm;rate=16000")
                )
            elif msg.get("text"):
                data = json.loads(msg["text"])
                if data.get("type") == "function_response":
                    name    = data["name"]
                    call_id = data["call_id"]
                    result  = data.get("result", "done")
                    if name == "show_map" and isinstance(result, dict):
                        field = result.get("field")
                        addr  = result.get("address")
                        if field and addr:
                            order = call_orders.get(session_id, {})
                            order[field] = addr
                            call_orders[session_id] = order
                            field_label = "موقع الاستلام" if field == "sender_location" else "موقع التسليم"
                            await session.send_realtime_input(
                                text=f"[تأكيد الموقع] تم تأكيد {field_label}: {addr}. الآن تكلّم صوتياً للمستخدم أولاً ثم اسأله عن المعلومات التالية."
                            )
                    else:
                        await session.send_tool_response(
                            function_responses=[genai_types.FunctionResponse(
                                id=call_id, name=name,
                                response=result if isinstance(result, dict) else {"result": result},
                            )]
                        )
                elif data.get("type") == "end_call":
                    break
    except Exception as e:
        import traceback; traceback.print_exc()


async def _gemini_to_browser(session, browser_ws, session_id, order, genai_types):
    pending_complete = None
    try:
        while True:
            async for response in session.receive():
                if response.data:
                    await browser_ws.send_bytes(response.data)
                if response.text:
                    await browser_ws.send_json({"type": "transcript", "text": response.text})
                sc = response.server_content if hasattr(response, "server_content") else None
                if sc and hasattr(sc, "input_transcription") and sc.input_transcription:
                    t = sc.input_transcription
                    if hasattr(t, "text") and t.text:
                        await browser_ws.send_json({"type": "user_transcript", "text": t.text})
                if response.tool_call:
                    for fc in response.tool_call.function_calls:
                        result = await _handle_function_call(fc, browser_ws, session_id, order, session, genai_types)
                        if isinstance(result, dict) and result.get("type") == "pending_complete":
                            pending_complete = result

            if pending_complete:
                if pending_complete.get("is_partial"):
                    await browser_ws.send_json({"type": "order_saved", "order": pending_complete["order"], "farewell_message": pending_complete["farewell_message"]})
                else:
                    await browser_ws.send_json({"type": "complete_order", "order": pending_complete["order"], "farewell_message": pending_complete["farewell_message"], "call_id": pending_complete["call_id"]})
                pending_complete = None
    except Exception as e:
        import traceback; traceback.print_exc()
        try:
            await browser_ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


async def _handle_function_call(fc, browser_ws, session_id, order, session, genai_types):
    name    = fc.name
    args    = dict(fc.args) if fc.args else {}
    call_id = fc.id

    if name == "update_order":
        for k, v in args.items():
            if v is not None and k in order:
                order[k] = v
        call_orders[session_id] = order
        await session.send_tool_response(function_responses=[genai_types.FunctionResponse(id=call_id, name=name, response={"result": "updated"})])

    elif name == "show_map":
        field = args.get("field")
        hint  = "موقع الاستلام" if field == "sender_location" else "موقع التسليم"
        await browser_ws.send_json({"type": "show_map", "field": field, "address": args.get("address", ""), "call_id": call_id, "hint_text": f"زين، حدد {hint} بالضبط على الخريطة اللي ظهرت لك"})
        await session.send_tool_response(function_responses=[genai_types.FunctionResponse(id=call_id, name=name, response={"status": "waiting_for_confirmation", "message": "الخريطة ظهرت للمستخدم. انتظر حتى يؤكد الموقع ثم ستصلك رسالة بالعنوان الدقيق."})])

    elif name == "complete_order":
        is_partial     = args.get("is_partial_order", False)
        completed_order = dict(call_orders.get(session_id, order))
        await session.send_tool_response(function_responses=[genai_types.FunctionResponse(id=call_id, name=name, response={"result": "done"})])
        if is_partial:
            preserved = {k: order.get(k) for k in ["sender_name","sender_phone","sender_location","receiver_name","receiver_phone","receiver_location"]}
            new_order = _empty_order(); new_order.update(preserved)
            call_orders[session_id] = new_order; order.update(new_order)
        return {"type": "pending_complete", "order": completed_order, "call_id": call_id, "farewell_message": args.get("farewell_message", ""), "is_partial": is_partial}

    elif name == "show_unit_options":
        await browser_ws.send_json({"type": "show_unit_options", "goods_type": args.get("goods_type", ""), "units": args.get("units", []), "call_id": call_id})
        await session.send_tool_response(function_responses=[genai_types.FunctionResponse(id=call_id, name=name, response={"result": "displayed"})])
    elif name == "show_weight_options":
        await browser_ws.send_json({"type": "show_weight_options", "call_id": call_id})
        await session.send_tool_response(function_responses=[genai_types.FunctionResponse(id=call_id, name=name, response={"result": "displayed"})])
    elif name == "show_shipping_options":
        await browser_ws.send_json({"type": "show_shipping_options", "call_id": call_id})
        await session.send_tool_response(function_responses=[genai_types.FunctionResponse(id=call_id, name=name, response={"result": "displayed"})])
    elif name == "show_schedule_picker":
        await browser_ws.send_json({"type": "show_schedule_picker", "call_id": call_id})
        await session.send_tool_response(function_responses=[genai_types.FunctionResponse(id=call_id, name=name, response={"result": "displayed"})])

    return None


@router.websocket("/ws/call/{session_id}")
async def voice_call_ws(websocket: WebSocket, session_id: str):
    await websocket.accept()
    try:
        await _run_gemini_live(session_id, websocket)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        import traceback; traceback.print_exc()
    finally:
        call_orders.pop(session_id, None)
