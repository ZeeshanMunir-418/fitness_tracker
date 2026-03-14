import { useMemo } from "react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const useGreeting = () => {
  return useMemo(() => {
    const time = new Date();
    const hours = time.getHours();
    const day = DAYS[time.getDay()];

    const greeting =
      hours < 12 ? "Good Morning" :
        hours < 17 ? "Good Afternoon" :
          hours < 21 ? "Good Evening" :
            "Good Night";

    return { greeting, day };
  }, []);
};