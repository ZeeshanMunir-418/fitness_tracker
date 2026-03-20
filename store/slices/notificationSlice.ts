import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  receivedAt: string;
  read: boolean;
}

export interface NotificationState {
  permissionGranted: boolean;
  expoPushToken: string | null;
  inAppQueue: InAppNotification[];
  scheduling: boolean;
}

type NotificationsRootState = {
  notifications: NotificationState;
};

const initialState: NotificationState = {
  permissionGranted: false,
  expoPushToken: null,
  inAppQueue: [],
  scheduling: false,
};

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setPermissionGranted(state, action: PayloadAction<boolean>) {
      state.permissionGranted = action.payload;
    },
    setExpoPushToken(state, action: PayloadAction<string | null>) {
      state.expoPushToken = action.payload;
    },
    enqueueInAppNotification(
      state,
      action: PayloadAction<{
        title: string;
        body: string;
        data?: Record<string, string>;
      }>,
    ) {
      state.inAppQueue.unshift({
        id: crypto.randomUUID(),
        title: action.payload.title,
        body: action.payload.body,
        data: action.payload.data,
        receivedAt: new Date().toISOString(),
        read: false,
      });

      if (state.inAppQueue.length > 50) {
        state.inAppQueue = state.inAppQueue.slice(0, 50);
      }
    },
    markNotificationRead(state, action: PayloadAction<string>) {
      const item = state.inAppQueue.find((n) => n.id === action.payload);
      if (item) {
        item.read = true;
      }
    },
    markAllNotificationsRead(state) {
      for (const item of state.inAppQueue) {
        item.read = true;
      }
    },
    clearNotificationQueue(state) {
      state.inAppQueue = [];
    },
    setScheduling(state, action: PayloadAction<boolean>) {
      state.scheduling = action.payload;
    },
  },
});

export const {
  setPermissionGranted,
  setExpoPushToken,
  enqueueInAppNotification,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotificationQueue,
  setScheduling,
} = notificationSlice.actions;

export const selectUnreadCount = (state: NotificationsRootState): number => {
  return state.notifications.inAppQueue.filter(
    (n: InAppNotification) => !n.read,
  ).length;
};

export default notificationSlice.reducer;
