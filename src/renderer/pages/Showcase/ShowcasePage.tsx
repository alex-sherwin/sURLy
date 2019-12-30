// third party
import React, { useState } from "react";

// local
import { TextExpression } from "../../../shared/models/TextExpression";
import { styled } from "../../theme";
import { OneLineTextField4 } from "../../components/TextField/OneLineTextField4";

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

  return (
    <RootDiv>
      {/* <OneLineTextField4 value={DEFAULT_VALUE} onChange={setValue} /> */}
      <OneLineTextField4 value={value} />
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
