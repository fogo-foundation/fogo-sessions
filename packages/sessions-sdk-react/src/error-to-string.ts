export const errorToString = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === "string") {
    return error.toString();
  } else if (typeof error === "object") {
    return JSON.stringify(error);
  } else {
    return "Unknown Error";
  }
};
