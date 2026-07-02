import { describe, it, expect, vi, beforeEach } from "vitest";
import { createConfigOverrideService } from "../config-override-service";

describe("config override service", () => {
  const configOverrideRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    set: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects restricted security override keys", async () => {
    const service = createConfigOverrideService({
      config: { admin: { configCacheTtlSeconds: 0 } } as never,
      configOverrideRepository,
    });

    await expect(
      service.setOverride("passwordPolicy.checkBreachedPasswords", false, "admin-1")
    ).rejects.toThrow(/not overridable/);
    expect(configOverrideRepository.set).not.toHaveBeenCalled();
  });

  it("allows operational override keys", async () => {
    const service = createConfigOverrideService({
      config: { admin: { configCacheTtlSeconds: 0 } } as never,
      configOverrideRepository,
    });

    await service.setOverride("profile.enabled", true, "admin-1");
    expect(configOverrideRepository.set).toHaveBeenCalledWith("profile.enabled", true, "admin-1");
  });
});
