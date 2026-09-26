"use client";

import CoreCourseBuilder from "@core/components/CourseBuilder";
import { saveCourseAction } from "@/app/courses/actions";
import { saveTargetTypeAction } from "@/app/targets/actions";

type Props = Omit<React.ComponentProps<typeof CoreCourseBuilder>, "saveAction" | "saveTargetAction">;

export default function CourseBuilder(props: Props) {
  return <CoreCourseBuilder {...props} saveAction={saveCourseAction} saveTargetAction={saveTargetTypeAction} />;
}
