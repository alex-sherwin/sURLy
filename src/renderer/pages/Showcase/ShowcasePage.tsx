// third party
import React, { useState } from "react";

// local
import { TextExpression } from "../../../shared/models/TextExpression";
import { styled } from "../../theme";
import { OneLineTextField } from "../../components/TextField/OneLineTextField";

const DEFAULT_RAW_VALUE = "http://{hostname}.com:{port}/http/some-thing/_herewego?value=abc%20123";
const DEFAULT_VALUE: TextExpression = {
  raw: DEFAULT_RAW_VALUE,
  vars: [
    { lineNumber: 0, startIndex: 7, endIndex: 17, display: "{hostname}" },
    { lineNumber: 0, startIndex: 22, endIndex: 28, display: "{port}" },
  ],
};

export const ShowcasePage = () => {

  const [value, setValue] = useState<TextExpression>(DEFAULT_VALUE);

  const onChange = (expr: TextExpression) => {
    console.log("got new text expression", expr);
  };

  return (
    <RootDiv>
      <OneLineTextField initialValue={value} onChange={onChange} />
    </RootDiv>
  );
};

const RootDiv = styled.div`
  display: flex;
  flex-direction: row;
  height: 5rem;
  width: 100%;
  border: solid 1px #ff0000;
  align-items: center;
  justify-content: center;
  cursor: text;
`;
