"use server";

function validateEmail(email: string) {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(String(email).toLowerCase());
}

export async function createContactData(_prevState: any, formData: FormData) {
  const rawFormData = {
    lastname: formData.get("lastname") as string,
    firstname: formData.get("firstname") as string,
    company: formData.get("company") as string,
    email: formData.get("email") as string,
    message: formData.get("message") as string,
  };

  if (!rawFormData.lastname) {
    return { status: "error", message: "姓を入力してください" };
  }

  if (!rawFormData.firstname) {
    return { status: "error", message: "名を入力してください" };
  }

  if (!rawFormData.company) {
    return { status: "error", message: "会社名を入力してください" };
  }

  if (!rawFormData.email) {
    return { status: "error", message: "メールアドレスを入力してください" };
  }

  if (!validateEmail(rawFormData.email)) {
    return {
      status: "error",
      message: "メールアドレスの形式が正しくありません",
    };
  }

  if (!rawFormData.message) {
    return { status: "error", message: "メッセージを入力してください。" };
  }

  const portalId = process.env.HUBSPOT_PORTAL_ID;
  const formId = process.env.HUBSPOT_FORM_ID;

  if (!portalId || !formId) {
    console.error("HUBSPOT_PORTAL_ID / HUBSPOT_FORM_ID が未設定");
    return {
      status: "error",
      message: "設定エラー：管理者に連絡してください。",
    };
  }

  const url = `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`;

  const payload = {
    fields: [
      { name: "lastname", value: rawFormData.lastname },
      { name: "firstname", value: rawFormData.firstname },
      { name: "company", value: rawFormData.company },
      { name: "email", value: rawFormData.email },
      { name: "message", value: rawFormData.message },
    ],
    // GDPR 必須のポータルでは以下が必要（不要なら削除可）
    // legalConsentOptions: {
    //   consent: {
    //     consentToProcess: true,
    //     text: "I agree to allow processing of my data.",
    //     communications: [{ value: true, subscriptionTypeId: 999, text: "I agree to receive communications." }]
    //   }
    // }
  };

  const result = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    // 企業プロキシ等で必要な場合: next: { revalidate: 0 }
  });

  // エラーハンドリングを厳密に
  const text = await result.text(); // まずテキストで読む（HTMLエラーでも読める）
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* HTML 等JSON以外 */
  }

  if (!result.ok) {
    console.error("HubSpot submit error", {
      status: result.status,
      data: data ?? text,
    });
    return { status: "error", message: "お問い合わせに失敗しました。" };
  }

  console.log("HubSpot submit success", { data });

  return { status: "success", message: "OK" };
}
