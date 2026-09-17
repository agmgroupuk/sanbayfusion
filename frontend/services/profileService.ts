interface ProfileData {
  name: string;
  email: string;
  avatar?: string;
  bio: string;
  phoneNumber: string;
  location: string;
  timezone: string;
  profession: string;
  company: string;
  website: string;
  socialLinks: {
    linkedin: string;
    twitter: string;
    github: string;
  };
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    marketingEmails: boolean;
    productUpdates: boolean;
  };
}

interface UpdateProfileResponse {
  success: boolean;
  profile: ProfileData;
  message?: string;
  error?: string;
}

class ProfileService {
  private baseUrl: string;

  constructor() {
    // Always use relative path to go through NGINX proxy
    this.baseUrl = '/api';
  }

  async getProfile(): Promise<ProfileData> {
    try {
      const response = await fetch(`${this.baseUrl}/user/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: any = await response.json();

      const apiProfile = data.profile || data;
      if (!apiProfile) {
        throw new Error('No profile data in response');
      }

      // Map backend profile shape into the richer ProfileData shape,
      // using safe fallbacks for optional fields so we never show mock data.
      const mappedProfile: ProfileData = {
        name: apiProfile.name || 'User',
        email: apiProfile.email || '',
        avatar: apiProfile.avatar || '',
        bio: apiProfile.bio || '',
        phoneNumber: apiProfile.phoneNumber || '',
        location: apiProfile.location || '',
        timezone: apiProfile.timezone || '',
        profession: apiProfile.profession || '',
        company: apiProfile.company || '',
        website: apiProfile.website || '',
        socialLinks: {
          linkedin: apiProfile.socialLinks?.linkedin || '',
          twitter: apiProfile.socialLinks?.twitter || '',
          github: apiProfile.socialLinks?.github || '',
        },
        preferences: {
          emailNotifications:
            apiProfile.preferences?.emailNotifications ?? true,
          smsNotifications: apiProfile.preferences?.smsNotifications ?? false,
          marketingEmails: apiProfile.preferences?.marketingEmails ?? true,
          productUpdates: apiProfile.preferences?.productUpdates ?? true,
        },
      };

      return mappedProfile;
    } catch (error) {
      console.error('Get profile error:', error);
      // Surface the error so the dashboard can show a proper error state
      // instead of misleading mock data.
      throw error;
    }
  }

  async updateProfile(profileData: Partial<ProfileData>): Promise<ProfileData> {
    try {
      const response = await fetch(`${this.baseUrl}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: UpdateProfileResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }

      return data.profile;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  async updatePreferences(
    userId: string,
    preferences: ProfileData['preferences']
  ): Promise<ProfileData['preferences']> {
    try {
      const response = await fetch(
        `${this.baseUrl}/user/profile/${userId}/preferences`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ preferences }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update preferences');
      }

      return data.preferences;
    } catch (error) {
      console.error('Update preferences error:', error);
      throw error;
    }
  }

  async uploadAvatar(userId: string, file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(
        `${this.baseUrl}/user/profile/${userId}/avatar`,
        {
          method: 'POST',
          credentials: 'include',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.message || data.error || 'Failed to upload avatar'
        );
      }

      return data.avatarUrl || data.avatar;
    } catch (error) {
      console.error('Upload avatar error:', error);
      throw error;
    }
  }
}

export const profileService = new ProfileService();
export type { ProfileData, UpdateProfileResponse };
