import React from "react";
import { render } from "@testing-library/react-native";
import App from "../src/App";

describe("App Component", () => {
  it("renders without crashing", () => {
    expect(() => render(<App />)).not.toThrow();
  });
});
