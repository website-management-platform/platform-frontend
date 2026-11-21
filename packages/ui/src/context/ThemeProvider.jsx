import { ThemeContext } from "@/context/ThemeContext";
import { useColorMode } from "@/hooks/useColorMode";
import { useDensity } from "@/hooks/useDensity";

const ThemeProvider = ({ children }) => {
  const colorMode = useColorMode();
  const density = useDensity();
  return (
    <ThemeContext.Provider value={{ ...colorMode, ...density }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
