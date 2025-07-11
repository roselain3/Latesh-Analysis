# 🖼️ Avatar Features Added to Lab Game

## New Functionality

### 1. **Automatic Discord Avatar Detection**
- The system now automatically fetches Discord profile pictures for users
- Uses real profile pictures when available for more authentic simulations

### 2. **Profile Picture Requests**
- When users don't have profile pictures, the bot asks in chat for image URLs
- Automatically detects image URLs posted in response
- Smart handling for single vs multiple missing avatars

### 3. **Manual Avatar Setting**
- New command: `/latesh avatar @user <image_url>`
- Supports PNG, JPG, JPEG, GIF, and WebP formats
- Validates URLs before saving
- Updates are saved to the user_profiles.json file

### 4. **Smart Avatar Resolution**
The system follows this priority order:
1. **Discord Avatar** - Fetched directly from Discord API
2. **Custom Avatar** - Set via `/latesh avatar` command or auto-detected from chat
3. **Generated Avatar** - Fallback to ui-avatars.com with the person's name

### 5. **Message Handling**
- Listens for image URLs in chat during active lab games
- Automatically assigns URLs to users who need profile pictures
- Provides helpful guidance when multiple users need pictures

## How It Works

1. **During Game Setup**: System checks which participants need profile pictures
2. **Avatar Requests**: Sends requests in chat for missing pictures
3. **Auto-Detection**: Monitors chat for image URLs and assigns them appropriately
4. **Webhook Integration**: Uses real avatars in webhook messages for authentic appearance
5. **Persistent Storage**: Saves custom avatars to user profiles for future use

## Example Usage

```
/latesh start "Team meeting about robot design" #simulation-channel
# System detects missing avatars and requests them
# User posts: https://example.com/ritesh-photo.png
# System automatically assigns it to Ritesh's profile
# Or manually: /latesh avatar @Ritesh https://example.com/ritesh-photo.png
```

## Benefits

- **More Realistic Simulations**: Real faces make conversations feel more authentic
- **Better Immersion**: Users can visually identify with the personalities
- **Persistent Setup**: Once set, avatars are saved for future simulations
- **Flexible Input**: Multiple ways to provide profile pictures
- **Smart Automation**: Minimal manual work required

The lab game now provides a much more immersive and realistic conversation simulation experience!
