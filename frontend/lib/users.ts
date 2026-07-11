import { apiPut } from "@/lib/api";
import type { User } from "@/types/user";

interface ApiUser {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  public_key: string | null;
  status: User["status"];
  created_at: string;
  updated_at: string;
}

export interface UpdateProfilePayload {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

function mapUser(user: ApiUser): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    status: user.status,
    bio: user.bio,
    publicKey: user.public_key,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const response = await apiPut<ApiUser>("/api/users/me", {
    display_name: payload.displayName,
    avatar_url: payload.avatarUrl,
    bio: payload.bio,
  });
  return mapUser(response);
}
