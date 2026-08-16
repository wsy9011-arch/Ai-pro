"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (
        (event === "PASSWORD_RECOVERY" ||
          event === "SIGNED_IN") &&
        session
      ) {
        setReady(true);
        setChecking(false);
        setMessage("");
      }
    });

    async function prepareRecoverySession() {
      try {
        const url = new URL(window.location.href);

        const queryError =
          url.searchParams.get("error_description") ||
          url.searchParams.get("error");

        const hashParams = new URLSearchParams(
          window.location.hash.replace(/^#/, "")
        );

        const hashError =
          hashParams.get("error_description") ||
          hashParams.get("error");

        if (queryError || hashError) {
          throw new Error(
            decodeURIComponent(
              String(queryError || hashError).replace(/\+/g, " ")
            )
          );
        }

        const code = url.searchParams.get("code");

        if (code) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            throw error;
          }

          window.history.replaceState(
            {},
            document.title,
            "/reset-password"
          );
        } else {
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              throw error;
            }

            window.history.replaceState(
              {},
              document.title,
              "/reset-password"
            );
          }
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!mounted) return;

        if (session) {
          setReady(true);
          setMessage("");
        } else {
          setReady(false);
          setMessage(
            "비밀번호 재설정 링크가 만료되었거나 올바르지 않습니다. 재설정 메일을 다시 받아주세요."
          );
        }
      } catch (error) {
        console.error("PASSWORD RECOVERY SESSION ERROR:", error);

        if (!mounted) return;

        setReady(false);
        setMessage(
          error instanceof Error
            ? error.message
            : "비밀번호 재설정 링크를 확인하지 못했습니다."
        );
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    }

    void prepareRecoverySession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (password.length < 6) {
      setMessage("새 비밀번호는 6자 이상 입력해주세요.");
      return;
    }

    if (password !== passwordConfirm) {
      setMessage("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();

      setPassword("");
      setPasswordConfirm("");
      setComplete(true);
    } catch (error) {
      console.error("PASSWORD UPDATE ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "비밀번호를 변경하지 못했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-sky-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
        <div className="w-full">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500 text-3xl shadow-lg shadow-sky-200">
              🔑
            </div>

            <div className="text-3xl font-black tracking-tight text-slate-900">
              해결<span className="text-sky-500">소</span>
            </div>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              새 비밀번호 설정
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-sky-100 sm:p-9">
            {checking ? (
              <div className="py-8 text-center">
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500" />
                <p className="mt-4 text-sm font-bold text-slate-500">
                  재설정 링크를 확인하고 있습니다...
                </p>
              </div>
            ) : complete ? (
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl">
                  ✅
                </div>

                <h1 className="mt-5 text-2xl font-black text-slate-900">
                  비밀번호가 변경되었습니다
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  새 비밀번호로 다시 로그인해주세요.
                </p>

                <button
                  type="button"
                  onClick={() => router.replace("/login")}
                  className="mt-7 w-full rounded-xl bg-sky-500 px-5 py-4 text-sm font-black text-white shadow-lg shadow-sky-200 transition hover:bg-sky-600"
                >
                  로그인하러 가기
                </button>
              </div>
            ) : ready ? (
              <>
                <p className="text-sm font-black text-sky-500">
                  NEW PASSWORD
                </p>

                <h1 className="mt-1 text-2xl font-black text-slate-900">
                  새 비밀번호를 입력해주세요
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  앞으로 로그인할 때 사용할 새 비밀번호를 설정합니다.
                </p>

                <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-800">
                      새 비밀번호
                    </label>

                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="6자 이상 입력"
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-800">
                      새 비밀번호 확인
                    </label>

                    <input
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) =>
                        setPasswordConfirm(e.target.value)
                      }
                      placeholder="새 비밀번호 다시 입력"
                      autoComplete="new-password"
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
                    disabled={saving}
                    className="w-full rounded-xl bg-sky-500 px-5 py-4 text-sm font-black text-white shadow-lg shadow-sky-200 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "변경하는 중..."
                      : "새 비밀번호로 변경"}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
                  ⚠️
                </div>

                <h1 className="mt-5 text-2xl font-black text-slate-900">
                  재설정 링크를 사용할 수 없습니다
                </h1>

                <p className="mt-3 text-sm leading-6 text-red-600">
                  {message ||
                    "비밀번호 재설정 메일을 다시 요청해주세요."}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    router.replace("/forgot-password")
                  }
                  className="mt-7 w-full rounded-xl bg-sky-500 px-5 py-4 text-sm font-black text-white shadow-lg shadow-sky-200 transition hover:bg-sky-600"
                >
                  재설정 메일 다시 받기
                </button>

                <button
                  type="button"
                  onClick={() => router.replace("/login")}
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
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
