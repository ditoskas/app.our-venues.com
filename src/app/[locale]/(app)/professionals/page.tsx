import { listProfessionals, professionalPlan, storageQuotaMB, BYTES_PER_MB } from "@/lib/professionals";
import { getStorageUsage } from "@/lib/uploads";
import { requirePageRole } from "@/lib/auth";
import ProfessionalsManager, {
  type SerializedProfessional,
} from "./ProfessionalsManager";

export const dynamic = "force-dynamic";

export default async function ProfessionalsPage() {
  await requirePageRole(["Root"]);

  const professionals = await listProfessionals();
  // Usage comes from the S3 bucket (one listing per professional, in
  // parallel). A storage failure shouldn't take the whole page down — the
  // row then just shows no usage figure.
  const usage = await Promise.all(
    professionals.map((p) =>
      getStorageUsage(p._id.toString())
        .then((u) => u.usedBytes)
        .catch(() => undefined)
    )
  );

  const serialized: SerializedProfessional[] = professionals.map((p, i) => ({
    _id: p._id.toString(),
    companyName: p.companyName,
    contactPerson: p.contactPerson,
    phone: p.phone,
    mobile: p.mobile,
    email: p.email,
    website: p.website,
    country: p.country,
    city: p.city,
    address: p.address,
    postCode: p.postCode,
    logoFilename: p.logoFilename,
    plan: professionalPlan(p),
    storageQuotaMB: p.storageQuotaMB,
    quotaBytes: storageQuotaMB(p) * BYTES_PER_MB,
    usedBytes: usage[i],
  }));

  return <ProfessionalsManager professionals={serialized} />;
}
