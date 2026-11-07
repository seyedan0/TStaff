import { User } from "../../domain/user.entity.js";

export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  findByPhoneNumber(phoneNumber: string): Promise<User | null>;
  findByApplicantId(applicantId: string): Promise<User | null>;
  save(user: User): Promise<void>;
}
