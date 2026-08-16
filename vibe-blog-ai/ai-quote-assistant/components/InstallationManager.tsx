"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import InstallationReport from "./InstallationReport";

const PHOTO_BUCKET = "installation-photos";
const MAX_PHOTOS_PER_GROUP = 10;

type Contract = {
  id: string;
  user_id: string;
  customer_id: string;
  contract_date: string;
  amount: number;
  status: string;
  memo: string | null;
  before_photos: string[] | null;
  after_photos: string[] | null;
  installation_note: string | null;
  installation_date: string | null;
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  region: string | null;
  service_type: string | null;
  status: string | null;
};

type PhotoType = "before" | "after";

export default function InstallationManager() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<PhotoType | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<"all" | "progress" | "done">("all");

  const [editingContract, setEditingContract] =
    useState<Contract | null>(null);
  const [editInstallationDate, setEditInstallationDate] = useState("");
  const [editInstallationNote, setEditInstallationNote] = useState("");
  const [comparePair, setComparePair] = useState<{before:string;after:string;index:number;}|null>(null);
  const [showReport, setShowReport] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      const [contractResult, customerResult] = await Promise.all([
        supabase
          .from("contracts")
          .select(
            "id,user_id,customer_id,contract_date,amount,status,memo,before_photos,after_photos,installation_note,installation_date"
          )
          .eq("user_id", user.id)
          .in("status", ["계약완료", "시공진행", "시공완료"])
          .order("contract_date", { ascending: false }),

        supabase
          .from("customers")
          .select("id,name,phone,region,service_type,status")
          .eq("user_id", user.id),
      ]);

      if (contractResult.error) throw contractResult.error;
      if (customerResult.error) throw customerResult.error;

      setContracts((contractResult.data ?? []) as Contract[]);
      setCustomers((customerResult.data ?? []) as Customer[]);
    } catch (err) {
      console.error("INSTALLATION LOAD ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "시공 정보를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const customerMap = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers]
  );

  const installationItems = useMemo(() => {
    return contracts
      .map((contract) => ({
        contract,
        customer: customerMap.get(contract.customer_id),
      }))
      .filter((item) => {
        if (!item.customer) return false;

        if (view === "progress") {
          return item.contract.status === "시공진행";
        }

        if (view === "done") {
          return item.contract.status === "시공완료";
        }

        return ["계약완료", "시공진행", "시공완료"].includes(
          item.contract.status
        );
      });
  }, [contracts, customerMap, view]);

  const progressCount = useMemo(
    () =>
      contracts.filter((contract) => contract.status === "시공진행").length,
    [contracts]
  );

  const doneCount = useMemo(
    () =>
      contracts.filter((contract) => contract.status === "시공완료").length,
    [contracts]
  );

  const scheduledCount = useMemo(
    () =>
      contracts.filter(
        (contract) =>
          contract.status !== "시공완료" && Boolean(contract.installation_date)
      ).length,
    [contracts]
  );

  async function updateContractStatus(
    contractId: string,
    status: "시공진행" | "시공완료"
  ) {
    setSavingId(contractId);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      const { data: updatedContract, error: updateError } = await supabase
        .from("contracts")
        .update({ status })
        .eq("id", contractId)
        .eq("user_id", user.id)
        .select(
          "id,user_id,customer_id,contract_date,amount,status,memo,before_photos,after_photos,installation_note,installation_date"
        )
        .single();

      if (updateError) throw updateError;
      if (!updatedContract) {
        throw new Error("시공 상태 변경 결과를 확인할 수 없습니다.");
      }

      setContracts((current) =>
        current.map((contract) =>
          contract.id === contractId
            ? (updatedContract as Contract)
            : contract
        )
      );

      alert(
        status === "시공진행"
          ? "시공 진행으로 변경되었습니다."
          : "시공 완료로 변경되었습니다."
      );
    } catch (err) {
      console.error("INSTALLATION CONTRACT STATUS UPDATE ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "시공 상태 변경 중 오류가 발생했습니다."
      );
    } finally {
      setSavingId(null);
    }
  }

  function openEdit(contract: Contract) {
    setEditingContract(contract);
    setEditInstallationDate(contract.installation_date || "");
    setEditInstallationNote(contract.installation_note || "");
    setError("");
  }

  function closeEdit() {
    if (savingId || uploadingType) return;
    setEditingContract(null);
    setEditInstallationDate("");
    setEditInstallationNote("");
    setError("");
  }


  function generatePdfReport() {
    setShowReport(true);
  }

  async function saveInstallationInfo() {
    if (!editingContract) return;

    setSavingId(editingContract.id);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      const { data: updatedContract, error: updateError } = await supabase
        .from("contracts")
        .update({
          installation_date: editInstallationDate || null,
          installation_note: editInstallationNote.trim() || null,
        })
        .eq("id", editingContract.id)
        .eq("user_id", user.id)
        .select(
          "id,user_id,customer_id,contract_date,amount,status,memo,before_photos,after_photos,installation_note,installation_date"
        )
        .single();

      if (updateError) throw updateError;
      if (!updatedContract) {
        throw new Error("시공 정보 저장 결과를 확인할 수 없습니다.");
      }

      setContracts((current) =>
        current.map((contract) =>
          contract.id === editingContract.id
            ? (updatedContract as Contract)
            : contract
        )
      );

      setEditingContract(updatedContract as Contract);
      alert("시공 정보가 저장되었습니다.");
    } catch (err) {
      console.error("INSTALLATION INFO SAVE ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "시공 정보 저장 중 오류가 발생했습니다."
      );
    } finally {
      setSavingId(null);
    }
  }

  async function uploadPhotos(
    event: ChangeEvent<HTMLInputElement>,
    type: PhotoType
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!editingContract || files.length === 0) return;

    const currentPhotos =
      type === "before"
        ? editingContract.before_photos ?? []
        : editingContract.after_photos ?? [];

    if (currentPhotos.length + files.length > MAX_PHOTOS_PER_GROUP) {
      alert(
        `시공 전/후 사진은 각각 최대 ${MAX_PHOTOS_PER_GROUP}장까지 등록할 수 있습니다.`
      );
      return;
    }

    setUploadingType(type);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      const uploadedUrls: string[] = [];

      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          throw new Error("이미지 파일만 업로드할 수 있습니다.");
        }

        if (file.size > 10 * 1024 * 1024) {
          throw new Error("사진 한 장의 용량은 10MB 이하로 올려주세요.");
        }

        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
        const randomId = crypto.randomUUID();

        const path = `${user.id}/${editingContract.id}/${type}/${Date.now()}-${randomId}.${safeExtension}`;

        const { error: uploadError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`사진 업로드 실패: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

        uploadedUrls.push(publicUrl);
      }

      const nextPhotos = [...currentPhotos, ...uploadedUrls];

      const updatePayload =
        type === "before"
          ? { before_photos: nextPhotos }
          : { after_photos: nextPhotos };

      const { data: updatedContract, error: updateError } = await supabase
        .from("contracts")
        .update(updatePayload)
        .eq("id", editingContract.id)
        .eq("user_id", user.id)
        .select(
          "id,user_id,customer_id,contract_date,amount,status,memo,before_photos,after_photos,installation_note,installation_date"
        )
        .single();

      if (updateError) throw updateError;
      if (!updatedContract) {
        throw new Error("사진 저장 결과를 확인할 수 없습니다.");
      }

      const nextContract = updatedContract as Contract;

      setContracts((current) =>
        current.map((contract) =>
          contract.id === nextContract.id ? nextContract : contract
        )
      );

      setEditingContract(nextContract);
    } catch (err) {
      console.error("INSTALLATION PHOTO UPLOAD ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "사진 업로드 중 오류가 발생했습니다."
      );
    } finally {
      setUploadingType(null);
    }
  }

  async function removePhoto(type: PhotoType, url: string) {
    if (!editingContract) return;

    const confirmed = window.confirm("이 사진을 삭제하시겠습니까?");
    if (!confirmed) return;

    setUploadingType(type);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      const currentPhotos =
        type === "before"
          ? editingContract.before_photos ?? []
          : editingContract.after_photos ?? [];

      const nextPhotos = currentPhotos.filter((item) => item !== url);

      const updatePayload =
        type === "before"
          ? { before_photos: nextPhotos }
          : { after_photos: nextPhotos };

      const { data: updatedContract, error: updateError } = await supabase
        .from("contracts")
        .update(updatePayload)
        .eq("id", editingContract.id)
        .eq("user_id", user.id)
        .select(
          "id,user_id,customer_id,contract_date,amount,status,memo,before_photos,after_photos,installation_note,installation_date"
        )
        .single();

      if (updateError) throw updateError;
      if (!updatedContract) {
        throw new Error("사진 삭제 결과를 확인할 수 없습니다.");
      }

      const nextContract = updatedContract as Contract;

      setContracts((current) =>
        current.map((contract) =>
          contract.id === nextContract.id ? nextContract : contract
        )
      );

      setEditingContract(nextContract);
    } catch (err) {
      console.error("INSTALLATION PHOTO REMOVE ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "사진 삭제 중 오류가 발생했습니다."
      );
    } finally {
      setUploadingType(null);
    }
  }

  function formatPrice(amount: number) {
    return `${Number(amount || 0).toLocaleString("ko-KR")}원`;
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("ko-KR");
  }

  return (
    <>
      <div className="pb-28">
        <div className="mb-7">
          <p className="text-sm font-bold text-blue-600">
            INSTALLATION MANAGEMENT
          </p>

          <h2 className="mt-1 text-3xl font-black">시공 관리</h2>

          <p className="mt-2 text-sm text-slate-500">
            시공 일정, 진행 상태, 현장 메모와 전·후 사진을 한곳에서 관리합니다.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="시공 대상"
            value={`${contracts.length}건`}
            description="전체 시공 고객"
            icon="🏠"
            active={view === "all"}
            onClick={() => setView("all")}
          />

          <SummaryCard
            title="예정 시공"
            value={`${scheduledCount}건`}
            description="일정이 등록된 건"
            icon="📅"
            active={false}
            onClick={() => setView("all")}
          />

          <SummaryCard
            title="시공 진행"
            value={`${progressCount}건`}
            description="현재 시공중"
            icon="🔨"
            active={view === "progress"}
            onClick={() => setView("progress")}
          />

          <SummaryCard
            title="시공 완료"
            value={`${doneCount}건`}
            description="완료된 시공"
            icon="✅"
            active={view === "done"}
            onClick={() => setView("done")}
          />
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-400">
                INSTALLATION LIST
              </p>
              <h3 className="mt-1 text-xl font-black">시공 목록</h3>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
              ↻ 새로고침
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">
              시공 정보를 불러오는 중입니다...
            </div>
          ) : installationItems.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-10 text-center">
              <p className="text-3xl">🏠</p>
              <p className="mt-3 font-bold text-slate-700">
                현재 시공 목록이 없습니다.
              </p>
              <p className="mt-1 text-sm text-slate-400">
                계약완료 고객이 생기면 이곳에서 관리할 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {installationItems.map(({ contract, customer }) => {
                if (!customer) return null;

                const beforeCount = contract.before_photos?.length ?? 0;
                const afterCount = contract.after_photos?.length ?? 0;

                return (
                  <div
                    key={contract.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-lg font-black">
                            {customer.name}
                          </h4>
                          <StatusBadge status={contract.status} />
                        </div>

                        <div className="mt-3 grid gap-2 text-sm text-slate-500 sm:grid-cols-2 xl:grid-cols-3">
                          <p>📞 {customer.phone || "-"}</p>
                          <p>📍 {customer.region || "-"}</p>
                          <p>
                            🏠 {customer.service_type || "시공 내용 미입력"}
                          </p>
                          <p>
                            📅 계약일 {formatDate(contract.contract_date)}
                          </p>
                          <p>
                            🗓️ 시공 예정일{" "}
                            {formatDate(contract.installation_date)}
                          </p>
                          <p>💰 {formatPrice(contract.amount)}</p>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                            📷 시공 전 {beforeCount}장
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                            📷 시공 후 {afterCount}장
                          </span>
                        </div>

                        {contract.installation_note && (
                          <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-800">
                            📝 {contract.installation_note}
                          </div>
                        )}

                        {contract.memo && (
                          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                            계약 메모 · {contract.memo}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                        <button
                          type="button"
                          onClick={() => openEdit(contract)}
                          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                        >
                          📷 시공 정보 관리
                        </button>

                        {contract.status === "계약완료" && (
                          <button
                            type="button"
                            disabled={savingId === contract.id}
                            onClick={() =>
                              void updateContractStatus(
                                contract.id,
                                "시공진행"
                              )
                            }
                            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:bg-blue-300"
                          >
                            🔨 시공 시작
                          </button>
                        )}

                        {contract.status === "시공진행" && (
                          <button
                            type="button"
                            disabled={savingId === contract.id}
                            onClick={() =>
                              void updateContractStatus(
                                contract.id,
                                "시공완료"
                              )
                            }
                            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-emerald-300"
                          >
                            ✅ 시공 완료
                          </button>
                        )}

                        {contract.status === "시공완료" && (
                          <div className="rounded-xl bg-emerald-50 px-5 py-3 text-center text-sm font-black text-emerald-700">
                            시공 완료
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editingContract && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/60 p-4">
          <div className="mx-auto my-6 w-full max-w-4xl rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-blue-600">
                  INSTALLATION DETAIL
                </p>
                <h3 className="mt-1 text-2xl font-black">
                  시공 정보 관리
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {customerMap.get(editingContract.customer_id)?.name ||
                    "고객 정보 없음"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                disabled={Boolean(savingId) || Boolean(uploadingType)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-black text-slate-500 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-black">
                  시공 예정일
                </label>
                <input
                  type="date"
                  value={editInstallationDate}
                  onChange={(event) =>
                    setEditInstallationDate(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-black">
                  시공 메모
                </label>
                <textarea
                  value={editInstallationNote}
                  onChange={(event) =>
                    setEditInstallationNote(event.target.value)
                  }
                  rows={4}
                  placeholder="현장 특이사항, 주차, 자재, 고객 요청사항 등을 입력하세요."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 leading-6 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => void saveInstallationInfo()}
                disabled={savingId === editingContract.id}
                className="w-full rounded-xl bg-blue-600 px-5 py-4 text-sm font-black text-white hover:bg-blue-700 disabled:bg-blue-300"
              >
                {savingId === editingContract.id
                  ? "저장 중..."
                  : "💾 시공 일정·메모 저장"}
              </button>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <PhotoSection
                title="시공 전 사진"
                description="작업 전 현장 상태를 등록하세요."
                photos={editingContract.before_photos ?? []}
                uploading={uploadingType === "before"}
                onUpload={(event) => void uploadPhotos(event, "before")}
                onRemove={(url) => void removePhoto("before", url)}
              />

              <PhotoSection
                title="시공 후 사진"
                description="완료된 현장 사진을 등록하세요."
                photos={editingContract.after_photos ?? []}
                uploading={uploadingType === "after"}
                onUpload={(event) => void uploadPhotos(event, "after")}
                onRemove={(url) => void removePhoto("after", url)}
              />
            </div>

            {(editingContract.before_photos?.length ?? 0)>0 && (editingContract.after_photos?.length ??0)>0 && (
            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <h4 className="font-black">↔ 시공 전·후 비교</h4>
            <div className="mt-2">
            <button type="button" onClick={()=>setComparePair({before:editingContract.before_photos![0],after:editingContract.after_photos![0],index:0})} className="rounded-lg bg-white px-4 py-2 font-black text-blue-700">🔍 1번 사진 비교하기</button>
            </div></div>)}

            {error && (
              <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                {error}
              </div>
            )}

            <div className="mt-7 space-y-3">
              <button
                type="button"
                onClick={generatePdfReport}
                className="w-full rounded-xl bg-slate-900 px-5 py-4 text-sm font-black text-white"
              >
                📄 시공 보고서 PDF 생성
              </button>

              <button
                type="button"
                onClick={closeEdit}
                disabled={Boolean(savingId) || Boolean(uploadingType)}
                className="w-full rounded-xl border border-slate-200 px-5 py-4 text-sm font-black text-slate-600 disabled:opacity-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      

      {showReport && editingContract && customerMap.get(editingContract.customer_id) && (
        <InstallationReport
          businessProfile={null}
          customer={customerMap.get(editingContract.customer_id)!}
          contractDate={editingContract.contract_date}
          installationDate={editingContract.installation_date}
          installationNote={editingContract.installation_note}
          beforePhotos={editingContract.before_photos ?? []}
          afterPhotos={editingContract.after_photos ?? []}
          onClose={() => setShowReport(false)}
        />
      )}

      {comparePair && <div className="fixed inset-0 z-[100001] bg-black/80 p-4"><div className="mx-auto max-w-4xl rounded-3xl bg-white p-6"><img src={comparePair.before} className="w-full"/><img src={comparePair.after} className="mt-4 w-full"/><button type="button" onClick={()=>setComparePair(null)} className="mt-4 w-full rounded-xl border px-4 py-3">닫기</button></div></div>}
    </>
  );
}

function PhotoSection({
  title,
  description,
  photos,
  uploading,
  onUpload,
  onRemove,
}: {
  title: string;
  description: string;
  photos: string[];
  uploading: boolean;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (url: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-black text-slate-900">{title}</h4>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {description}
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {photos.length}/{MAX_PHOTOS_PER_GROUP}
        </span>
      </div>

      <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-black text-slate-600 transition hover:border-blue-300 hover:bg-blue-50">
        {uploading ? "사진 업로드 중..." : "＋ 사진 선택"}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading || photos.length >= MAX_PHOTOS_PER_GROUP}
          onChange={onUpload}
          className="hidden"
        />
      </label>

      {photos.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((url) => (
            <div
              key={url}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
            >
              <img
                src={url}
                alt={title}
                className="aspect-square w-full object-cover"
              />

              <button
                type="button"
                onClick={() => onRemove(url)}
                className="absolute right-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-xs font-black text-white"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-xs font-bold text-slate-400">
          등록된 사진이 없습니다.
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const label = status || "계약완료";

  const className =
    label === "시공완료"
      ? "bg-emerald-50 text-emerald-700"
      : label === "시공진행"
      ? "bg-blue-50 text-blue-700"
      : "bg-amber-50 text-amber-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${className}`}
    >
      {label}
    </span>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  active,
  onClick,
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 ${
        active
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-500">{title}</p>
        <span className="text-xl">{icon}</span>
      </div>

      <p className="mt-4 text-2xl font-black">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{description}</p>
    </button>
  );
}