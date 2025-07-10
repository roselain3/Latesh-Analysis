const axios = require('axios');

class FRCAnalyzer {
    constructor(apiKey = null) {
        this.apiKey = apiKey || process.env.TBA_API_KEY;
        this.baseUrl = 'https://www.thebluealliance.com/api/v3';
        this.headers = {
            'X-TBA-Auth-Key': this.apiKey,
            'User-Agent': 'Latesh-Analysis-Bot/1.0'
        };
    }

    // Get event information
    async getEvent(eventKey) {
        try {
            const response = await axios.get(`${this.baseUrl}/event/${eventKey}`, {
                headers: this.headers
            });
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error fetching event:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Get matches for an event
    async getEventMatches(eventKey) {
        try {
            const response = await axios.get(`${this.baseUrl}/event/${eventKey}/matches`, {
                headers: this.headers
            });
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error fetching matches:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Get specific match
    async getMatch(matchKey) {
        try {
            const response = await axios.get(`${this.baseUrl}/match/${matchKey}`, {
                headers: this.headers
            });
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error fetching match:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Get team information
    async getTeam(teamKey) {
        try {
            const response = await axios.get(`${this.baseUrl}/team/${teamKey}`, {
                headers: this.headers
            });
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error fetching team:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Get team's event performance
    async getTeamEventPerformance(teamKey, eventKey) {
        try {
            const response = await axios.get(`${this.baseUrl}/team/${teamKey}/event/${eventKey}/status`, {
                headers: this.headers
            });
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error fetching team performance:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Predict match outcome (basic implementation)
    async predictMatch(matchKey) {
        try {
            const matchResult = await this.getMatch(matchKey);
            if (!matchResult.success) {
                return matchResult;
            }

            const match = matchResult.data;
            const redAlliance = match.alliances.red.team_keys;
            const blueAlliance = match.alliances.blue.team_keys;

            // Get team ratings (simplified - you'd want more sophisticated analysis)
            const redTeamData = await Promise.all(
                redAlliance.map(team => this.getTeam(team))
            );
            const blueTeamData = await Promise.all(
                blueAlliance.map(team => this.getTeam(team))
            );

            // Simple prediction based on team numbers (lower is often older/more experienced)
            // In reality, you'd use OPR, EPA, or other advanced metrics
            const redScore = redTeamData.reduce((sum, team) => {
                if (team.success) {
                    return sum + (10000 - parseInt(team.data.team_number));
                }
                return sum;
            }, 0);

            const blueScore = blueTeamData.reduce((sum, team) => {
                if (team.success) {
                    return sum + (10000 - parseInt(team.data.team_number));
                }
                return sum;
            }, 0);

            const prediction = {
                matchKey: matchKey,
                redAlliance: redAlliance,
                blueAlliance: blueAlliance,
                predictedWinner: redScore > blueScore ? 'red' : 'blue',
                confidence: Math.abs(redScore - blueScore) / Math.max(redScore, blueScore),
                redScore: Math.round(redScore / 100),
                blueScore: Math.round(blueScore / 100),
                analysis: 'Basic prediction based on team experience (team numbers)',
                disclaimer: 'This is a simplified prediction model for demonstration purposes'
            };

            return { success: true, data: prediction };
        } catch (error) {
            console.error('Error predicting match:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Format match data for Discord embed
    formatMatchEmbed(match, prediction = null) {
        const embed = {
            title: `🤖 FRC Match: ${match.match_number || 'Unknown'}`,
            color: 0xff6b35,
            fields: [
                {
                    name: '🔴 Red Alliance',
                    value: match.alliances.red.team_keys.map(team => 
                        team.replace('frc', '')).join(', '),
                    inline: true
                },
                {
                    name: '🔵 Blue Alliance',
                    value: match.alliances.blue.team_keys.map(team => 
                        team.replace('frc', '')).join(', '),
                    inline: true
                },
                {
                    name: '📊 Status',
                    value: match.comp_level === 'qm' ? 'Qualification' : 
                           match.comp_level === 'ef' ? 'Elimination' : 
                           match.comp_level.toUpperCase(),
                    inline: true
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Data from The Blue Alliance'
            }
        };

        // Add scores if match is completed
        if (match.alliances.red.score !== -1) {
            embed.fields.push({
                name: '🏆 Final Score',
                value: `Red: ${match.alliances.red.score} | Blue: ${match.alliances.blue.score}`,
                inline: false
            });
        }

        // Add prediction if provided
        if (prediction) {
            embed.fields.push({
                name: '🔮 Prediction',
                value: `**Winner:** ${prediction.predictedWinner.toUpperCase()}\n` +
                       `**Confidence:** ${(prediction.confidence * 100).toFixed(1)}%\n` +
                       `**Analysis:** ${prediction.analysis}`,
                inline: false
            });
        }

        return embed;
    }

    // Get current events
    async getCurrentEvents() {
        try {
            const currentYear = new Date().getFullYear();
            const response = await axios.get(`${this.baseUrl}/events/${currentYear}`, {
                headers: this.headers
            });
            
            const now = new Date();
            const currentEvents = response.data.filter(event => {
                const startDate = new Date(event.start_date);
                const endDate = new Date(event.end_date);
                return startDate <= now && now <= endDate;
            });

            return { success: true, data: currentEvents };
        } catch (error) {
            console.error('Error fetching current events:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = FRCAnalyzer;
