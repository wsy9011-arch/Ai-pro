"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailFromLogin = params.get("email");

    if (emailFromLogin) {
      setEmail(emailFromLogin);
    }
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setMessage("가입할 때 사용한 이메일 주소를 입력해주세요.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo,
        }
      );

      if (error) {
        throw error;
      }

      setSent(true);
    } catch (error) {
      console.error("PASSWORD RESET EMAIL ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "비밀번호 재설정 메일을 보내지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-sky-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
        <div className="w-full">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500 text-3xl shadow-lg shadow-sky-200">
              🔐
            </div>

            <div className="text-3xl font-black tracking-tight text-slate-900">
              해결<span className="text-sky-500">소</span>
            </div>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              비밀번호 재설정
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-sky-100 sm:p-9">
            {!sent ? (
              <>
                <p className="text-sm font-black text-sky-500">
                  PASSWORD RESET
                </p>

                <h1 className="mt-1 text-2xl font-black text-slate-900">
                  비밀번호를 잊으셨나요?
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  가입할 때 사용한 이메일을 입력하면 비밀번호를 다시
                  설정할 수 있는 링크를 보내드립니다.
                </p>

                <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-800">
                      이메일 주소
                    </label>

                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      autoComplete="email"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                  </div>

                  {message && (
                    <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-600">
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-sky-500 px-5 py-4 text-sm font-black text-white shadow-lg shadow-sky-200 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading
                      ? "메일 보내는 중..."
                      : "비밀번호 재설정 메일 보내기"}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl">
                  ✉️
                </div>

                <h1 className="mt-5 text-2xl font-black text-slate-900">
                  이메일을 확인해주세요
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  입력한 이메일이 가입된 계정이라면 비밀번호 재설정
                  링크가 발송됩니다.
                  <br />
                  메일의 링크를 눌러 새 비밀번호를 설정해주세요.
                </p>

                <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-4 text-sm font-bold text-slate-700">
                  {email}
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="mt-6 w-full rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  로그인 화면으로 돌아가기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
