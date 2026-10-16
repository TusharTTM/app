export function publicUser(u) {
  return {
    id: u._id,
    email: u.email,
    nickname: u.nickname,
    role: u.role,
    status: u.status,
    emailVerified: u.emailVerified,
    onboarded: u.onboarded,
    profile: {
      heightCm: u.profile?.heightCm ?? null,
      goalType: u.profile?.goalType ?? 'track_only',
      calorieTarget: u.profile?.calorieTarget ?? null,
      unitSystem: u.profile?.unitSystem ?? 'metric',
    },
  };
}
