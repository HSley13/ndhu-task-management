# NDHU Assistant

A mobile task management app for NDHU students. Syncs assignments directly from Moodle and lets you manage tasks, set reminders, take notes, and attach files, all in one interface.

## Screenshots

<table>
  <tr>
    <td align="center"><b>Login</b></td>
    <td align="center"><b>Calendar</b></td>
    <td align="center"><b>Day Detail</b></td>
    <td align="center"><b>Tasks</b></td>
    <td align="center"><b>Notes</b></td>
  </tr>
  <tr>
    <td><img src="photos/Simulator Screenshot - iPhone SE (3rd generation) - 2026-04-24 at 21.44.49.png" width="160"/></td>
    <td><img src="photos/Simulator Screenshot - iPhone SE (3rd generation) - 2026-04-24 at 21.45.37.png" width="160"/></td>
    <td><img src="photos/Simulator Screenshot - iPhone SE (3rd generation) - 2026-04-24 at 21.45.59.png" width="160"/></td>
    <td><img src="photos/Simulator Screenshot - iPhone SE (3rd generation) - 2026-04-24 at 21.46.34.png" width="160"/></td>
    <td><img src="photos/Simulator Screenshot - iPhone SE (3rd generation) - 2026-04-24 at 21.46.51.png" width="160"/></td>
  </tr>
  <tr>
    <td align="center"><b>Task Detail</b></td>
    <td align="center"><b>New Task</b></td>
    <td align="center"><b>Quick Add</b></td>
    <td align="center"><b>Attachments</b></td>
    <td align="center"><b>Settings</b></td>
  </tr>
  <tr>
    <td><img src="photos/Simulator Screenshot - iPhone SE (3rd generation) - 2026-04-24 at 21.46.41.png" width="160"/></td>
    <td><img src="photos/Simulator Screenshot - iPhone SE (3rd generation) - 2026-04-24 at 21.47.25.png" width="160"/></td>
    <td><img src="photos/Simulator Screenshot - iPhone SE (3rd generation) - 2026-04-24 at 21.47.16.png" width="160"/></td>
    <td><img src="photos/Simulator Screenshot - iPhone SE (3rd generation) - 2026-04-24 at 21.47.38.png" width="160"/></td>
    <td><img src="photos/Simulator Screenshot - iPhone SE (3rd generation) - 2026-04-24 at 21.47.00.png" width="160"/></td>
  </tr>
</table>

## Features

- **Moodle Sync** — logs in with your NDHU student credentials and automatically imports assignments from all your courses
- **Calendar View** — month overview with dot indicators on days that have tasks; tap any day to see its tasks
- **Task Management** — group tasks by overdue / today / this week / later; inline title editing, due date & time, course tag, subtasks
- **Reminders** — local push notifications with preset or custom offsets before the due date/time
- **Notes** — free-form rich-text notes with a two-column grid layout
- **Attachments** — attach images, audio recordings, PDFs, and other files to tasks; tap to open in-app or in the device's native viewer
- **Labels** — colour-coded tags for organising tasks across courses
- **Offline-first** — local SQLite database; syncs to the server when online

## Tech Stack

| Layer         | Technology                                                                  |
| ------------- | --------------------------------------------------------------------------- |
| Framework     | Expo SDK ~54 / React Native 0.81                                            |
| Language      | TypeScript                                                                  |
| Navigation    | React Navigation v7 (bottom tabs + native stack)                            |
| State         | Zustand                                                                     |
| Local DB      | expo-sqlite                                                                 |
| UI            | @gorhom/bottom-sheet, react-native-reanimated, react-native-gesture-handler |
| Calendar      | react-native-calendars                                                      |
| Notifications | expo-notifications                                                          |
| File handling | expo-file-system, expo-document-picker, expo-image-picker                   |
| Auth          | NDHU Moodle credentials (password never stored)                             |
| Backend       | Drogon C++ REST API                                                         |

## Getting Started

```bash
cd client
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app (iOS/Android) or press `i` / `a` to open in a simulator.

> Requires a valid NDHU student account to log in.
