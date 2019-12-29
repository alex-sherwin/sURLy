// third party
import React, { FC } from "react";

// local
import { styled } from "../../theme";
import { OneLineTextField2 } from "../../components/TextField/OneLineTextField2";

export const ShowcasePage = () => {
  return (
    <RootDiv>
      <OneLineTextField2 />
    </RootDiv>
  )
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
