import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import ScrapeProgressOverlay from "./components/ScrapeProgressOverlay";

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ScrapeProgressOverlay />
    </>
  );
}
