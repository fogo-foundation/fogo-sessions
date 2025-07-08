export const errorToString = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === "string") {
    return error.toString();
  } else {
    return "Unknown Error";
  }
};
