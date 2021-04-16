import React from "react";

interface GreetingsProps {
  name: string;
}

const Greetings = (name: GreetingsProps) => {
  return <div>Hello, {name}</div>;
};

export default Greetings;
