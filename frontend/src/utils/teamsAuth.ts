import * as microsoftTeams from '@microsoft/teams-js';

export async function initTeams(): Promise<boolean> {
  try {
    await microsoftTeams.app.initialize();
    return true;
  } catch {
    return false;
  }
}

export async function getTeamsUser(): Promise<{ userId: string; displayName: string; email: string } | null> {
  try {
    const context = await microsoftTeams.app.getContext();
    if (context.user?.id) {
      return {
        userId: context.user.id,
        displayName: context.user.displayName || '',
        email: context.user.userPrincipalName || '',
      };
    }
  } catch {
    // Not in Teams
  }
  return null;
}

export async function teamsAuthenticate(backendUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    microsoftTeams.authentication.authenticate({
      url: `${backendUrl}/api/auth/teams-callback`,
      width: 500,
      height: 600,
      successCallback: (token: string) => resolve(token),
      failureCallback: (reason: string) => reject(new Error(reason)),
    });
  });
}