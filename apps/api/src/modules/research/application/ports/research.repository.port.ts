import { ResearchCase } from "../../domain/research-case.entity.js";

export interface ResearchRepositoryPort {
  findById(id: string): Promise<ResearchCase | null>;
  findByCode(code: string): Promise<ResearchCase | null>;
  create(researchCase: ResearchCase): Promise<void>;
  saveWithVersionCheck(
    researchCase: ResearchCase,
    expectedVersion: number,
  ): Promise<void>;
  findAll(): Promise<ResearchCase[]>;
}
