import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const LoginSuccessPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = params.get("token");

    if (token) {
      login(token).then(() => {
        navigate("/");
      });
    } else {
      navigate("/login");
    }
  }, [params, login, navigate]);

  return <p>Loading...</p>;
};
