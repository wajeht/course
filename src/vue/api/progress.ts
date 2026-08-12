import { apiClient, expectProtectedJson } from "./client.js";

export const progressApi = {
  async saveProgress(lessonId: string, positionSeconds: number): Promise<void> {
    const response = await apiClient.api.progress.lessons[":lessonId"].$put({
      param: { lessonId },
      json: { positionSeconds },
    });
    await expectProtectedJson(response);
  },
  async completeLesson(lessonId: string): Promise<void> {
    const response = await apiClient.api.progress.lessons[":lessonId"].complete.$post({
      param: { lessonId },
    });
    await expectProtectedJson(response);
  },
  async resetLesson(lessonId: string): Promise<void> {
    const response = await apiClient.api.progress.lessons[":lessonId"].$delete({
      param: { lessonId },
    });
    await expectProtectedJson(response);
  },
  async resetCourse(courseId: string): Promise<void> {
    const response = await apiClient.api.progress.courses[":courseId"].$delete({
      param: { courseId },
    });
    await expectProtectedJson(response);
  },
};
