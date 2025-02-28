const axios = require('axios');

class GitHubService {
  constructor(accessToken) {
    this.api = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
  }

  async getOrganizations() {
    try {
      const response = await this.api.get('/user/orgs');
      return response.data;
    } catch (error) {
      console.error('Error fetching organizations:', error.message);
      throw error;
    }
  }

  async getOrganizationDetails(orgName) {
    try {
      const response = await this.api.get(`/orgs/${orgName}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching organization details for ${orgName}:`, error.message);
      throw error;
    }
  }

  async getOrganizationMembers(orgName) {
    try {
      const response = await this.api.get(`/orgs/${orgName}/members`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching organization members for ${orgName}:`, error.message);
      throw error;
    }
  }

  async getCopilotBilling(orgName) {
    try {
      // GitHub Copilot Enterprise billing endpoint
      const response = await this.api.get(`/orgs/${orgName}/copilot/billing`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching Copilot billing for ${orgName}:`, error.message);
      throw error;
    }
  }

  async getCopilotSeatDetails(orgName) {
    try {
      // GitHub Copilot seat assignment details
      const response = await this.api.get(`/orgs/${orgName}/copilot/seats`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching Copilot seat details for ${orgName}:`, error.message);
      throw error;
    }
  }

  async getUserCopilotUsage(orgName, username) {
    try {
      // Getting individual user's Copilot usage
      const response = await this.api.get(`/orgs/${orgName}/members/${username}/copilot/usage`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching Copilot usage for ${username} in ${orgName}:`, error.message);
      throw error;
    }
  }

  async assignCopilotSeat(orgName, username) {
    try {
      const response = await this.api.post(`/orgs/${orgName}/copilot/seats`, {
        selected_usernames: [username]
      });
      return response.data;
    } catch (error) {
      console.error(`Error assigning Copilot seat to ${username} in ${orgName}:`, error.message);
      throw error;
    }
  }

  async removeCopilotSeat(orgName, username) {
    try {
      const response = await this.api.delete(`/orgs/${orgName}/copilot/seats/${username}`);
      return response.data;
    } catch (error) {
      console.error(`Error removing Copilot seat from ${username} in ${orgName}:`, error.message);
      throw error;
    }
  }
}

module.exports = GitHubService;