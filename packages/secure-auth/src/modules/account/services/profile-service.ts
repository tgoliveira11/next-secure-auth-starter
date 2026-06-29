import type { SecureAuthConfig } from "@/core/types";
import type { UserRepository } from "../repositories/user-repository";

type ProfileServiceDeps = {
  config: SecureAuthConfig;
  userRepository: UserRepository;
};

export function createProfileService({ config, userRepository }: ProfileServiceDeps) {
  function isEnabled() { return config.profile?.enabled === true; }

  async function syncFromOAuth(
    userId: string,
    _provider: string,
    oauthProfile: { name?: string | null; image?: string | null }
  ): Promise<void> {
    if (!isEnabled()) return;
    const user = await userRepository.findById(userId);
    if (!user) return;
    // Only sync if the user hasn't manually edited their profile
    if (user.profileUpdatedAt) return;

    const patch: { displayName?: string; avatarUrl?: string } = {};
    if (oauthProfile.name) patch.displayName = oauthProfile.name;
    if (oauthProfile.image) patch.avatarUrl = oauthProfile.image;

    if (Object.keys(patch).length > 0) {
      await userRepository.updateProfile(userId, patch);
    }
  }

  async function getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    return {
      displayName: user?.displayName ?? null,
      avatarUrl: user?.avatarUrl ?? null,
      bio: user?.bio ?? null,
    };
  }

  async function updateProfile(
    userId: string,
    data: { displayName?: string; avatarUrl?: string; bio?: string }
  ): Promise<void> {
    await userRepository.updateProfile(userId, { ...data, profileUpdatedAt: new Date() });
  }

  return { isEnabled, syncFromOAuth, getProfile, updateProfile };
}

export type ProfileService = ReturnType<typeof createProfileService>;
