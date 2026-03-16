import { Workout } from "@/components/(tabs)/home/workout-card";

export const workouts: Workout[] = [
  {
    id: 1,
    title: "Upper Body Strength Training",
    image: require("@/assets/images/upper-body-strength.png"),
    duration: "45 MIN",
    exercisesCount: 6,
    day: "Sunday, 15 March",
  },
  {
    id: 2,
    title: "Core & Abs Blast",
    image: require("@/assets/images/core-abs.png"),
    duration: "30 MIN",
    exercisesCount: 8,
    day: "Monday, 16 March",
  },
  {
    id: 3,
    title: "Lower Body Strength Training",
    image: require("@/assets/images/lower-body-strength.png"),
    duration: "45 MIN",
    exercisesCount: 6,
    day: "Tuesday, 17 March",
  },
  {
    id: 4,
    title: "Full Body HIIT Workout",
    image: require("@/assets/images/full-body-hiit.png"),
    duration: "30 MIN",
    exercisesCount: 10,
    day: "Wednesday, 18 March",
  },
  {
    id: 5,
    title: "Yoga for Flexibility",
    image: require("@/assets/images/yoga-flexibility.png"),
    duration: "60 MIN",
    exercisesCount: 12,
    day: "Thursday, 19 March",
  },
]