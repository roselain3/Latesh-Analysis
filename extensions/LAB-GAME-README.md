# Lab Game Extension - Personality Simulation

## Overview
The Lab Game extension allows you to simulate conversations between different personality profiles loaded from your `user_profiles.json` file. This feature is perfect for testing scenarios, understanding different perspectives, and creating engaging roleplay conversations.

## Commands

### `/latesh start <description> [channel]`
Starts a new lab game with a given scenario description.
- **description**: The scenario or issue that participants will discuss
- **channel** (optional): The channel where the simulation will take place. If not specified, uses the current channel.

### `/latesh setting <description>`
Updates the current setting/context of the conversation.
- **description**: New context or environment for the conversation

### `/latesh pause`
Pauses the current conversation simulation.

### `/latesh resume`
Resumes a paused conversation simulation.

### `/latesh prompt <message>`
Injects a prompt or question into the conversation to guide participants.
- **message**: The prompt or question to add

### `/latesh restart`
Restarts the conversation with a fresh focus on the original topic. Useful when the discussion drifts off-topic.

### `/latesh stop`
Stops the current lab game and cleans up all data.

### `/latesh status`
Shows the current status of the lab game including participants, messages, and controls.

### `/latesh avatar <user> <url>`
Sets a profile picture for a user in the simulation.
- **user**: The Discord user to set the avatar for
- **url**: Direct link to the image file (PNG, JPG, JPEG, GIF, or WebP)

## How It Works

1. **Start**: Use `/latesh start` with a scenario description and optionally specify a channel
2. **Select Participants**: Choose 2-10 participants from your user profiles
3. **Begin**: Click the "Start Conversation" button to begin simulation
4. **Monitor**: Participants will automatically discuss the scenario in the selected channel based on their personalities
5. **Control**: Use pause/resume, setting changes, and prompts to guide the conversation from any channel (as the game creator)

## Features

- **Personality-Based Responses**: Each participant responds according to their personality profile
- **Human-Like Messages**: Messages appear as if real people are typing (using webhooks with their names and avatars)
- **Short, Natural Responses**: Participants respond with brief, casual messages just like real humans in chat
- **Realistic Language**: Uses natural speech patterns including slang, casual language, and authentic reactions
- **Recent Context**: Uses only the last 5 messages for context to keep conversations fresh and relevant
- **Fast Response Times**: Quick message intervals (1-4 seconds) for natural chat flow
- **Real Profile Pictures**: Uses actual Discord avatars or custom-set profile pictures
- **Automatic Avatar Requests**: Prompts users to provide profile pictures for more realistic simulations
- **Channel Selection**: Choose any channel for the simulation to take place
- **Cross-Channel Control**: Control the simulation from any channel as the game creator
- **Dynamic Webhook Creation**: Creates individual webhooks for each participant with their profile pictures
- **Webhook Persistence**: Saves webhook URLs to user profiles for instant reuse in future simulations
- **Individual Participant Webhooks**: Each participant gets their own dedicated webhook for maximum realism
- **Conversation History**: Maintains context throughout the simulation
- **Dynamic Settings**: Change the environment/context during the conversation
- **Interactive Controls**: Pause, resume, and guide conversations in real-time

## Configuration

Make sure your `data/user_profiles.json` contains detailed personality descriptions for best results. The AI uses these descriptions to generate authentic responses.

**Profile Pictures**: The system will:
1. First try to use Discord profile pictures automatically
2. Ask for custom profile picture URLs in chat if Discord avatars aren't available
3. Allow manual setting using `/latesh avatar @user <image_url>`
4. Fall back to generated avatars if no pictures are provided

**Channel Selection**: 
- When you specify a channel with `/latesh start "description" #channel`, the simulation will run in that exact channel
- The system creates individual webhooks for each participant with their profile pictures as avatars
- Webhook URLs are automatically saved to user profiles and reused for faster setup in future games
- Messages will appear as if real people are typing with their actual names and profile pictures
- If webhook creation fails, the system falls back to regular messages with name prefixes

**Permissions**:
- The bot needs "Send Messages" and "View Channel" permissions in your selected channel
- For the best experience, also give "Manage Webhooks" permission for realistic message appearance
- Without webhook permissions, messages will still work but be less realistic

Optional: The old `DEFAULT_WEBHOOK_URL` environment variable is no longer used - the system creates its own webhooks per channel.

## Example Scenarios

- "Team meeting to discuss robot design challenges"
- "Debate about programming language preferences"
- "Planning a community outreach event"
- "Resolving a conflict between team members"
- "Brainstorming session for new project ideas"

## Tips

- Use detailed scenario descriptions for better conversations
- Change settings during conversation to see how personalities adapt
- Use prompts to guide discussion toward specific topics
- Monitor the conversation and adjust as needed
- Try different participant combinations for varied dynamics
- **New**: Responses are now much shorter and more natural - expect quick, casual messages like "lol", "shut up", "you're so stupid", etc.
- **New**: Only the last 5 messages are used as context, so conversations stay fresh and relevant
- **New**: Faster message timing (1-4 seconds) creates more realistic chat flow

## Troubleshooting

**Webhooks not working?**
- Make sure the bot has "Manage Webhooks" permission in your channel
- If webhooks seem broken, they'll be automatically recreated on next game start
- Webhook URLs are saved to user profiles for faster reuse

**Messages going to wrong channel?**
- Ensure you're specifying the channel correctly: `/latesh start "description" #your-channel`
- Check if you have `DEFAULT_WEBHOOK_URL` environment variable set - this may override channel selection
- The latest version uses individual participant webhooks for maximum realism
- Make sure the bot has permission to send messages in your selected channel

**Profile pictures not working?**
- Use `/latesh avatar @user <direct-image-url>` to set custom pictures
- Ensure image URLs are direct links ending in .png, .jpg, .jpeg, .gif, or .webp
- The system will automatically request missing pictures when games start
