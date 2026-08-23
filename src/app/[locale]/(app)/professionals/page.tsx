import { listProfessionals } from "@/lib/professionals";
import { requirePageRole } from "@/lib/auth";
import ProfessionalsManager, {
  type SerializedProfessional,
} from "./ProfessionalsManager";

export const dynamic = "force-dynamic";

export default async function ProfessionalsPage() {
  await requirePageRole(["Root"]);

  const professionals = await listProfessionals();
  const serialized: SerializedProfessional[] = professionals.map((p) => ({
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
  }));

  return <ProfessionalsManager professionals={serialized} />;
}
