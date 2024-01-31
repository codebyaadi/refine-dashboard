import {
  CreateCompanyMutation,
  CreateCompanyMutationVariables,
  UsersSelectQuery,
} from "@/graphql/types";
import { CompanyList } from "./list";
import { useModalForm, useSelect } from "@refinedev/antd";
import { CREATE_COMPANY_MUTATION } from "@/graphql/mutations";
import { HttpError, useGo } from "@refinedev/core";
import { GetFields, GetFieldsFromList, GetVariables } from "@refinedev/nestjs-query";
import { Form, Input, Modal, Select } from "antd";
import { USERS_SELECT_QUERY } from "@/graphql/queries";
import { SelectOptionWithAvatar } from "@/components/avatar/select-option-with-avatar";

export const Create = () => {
  const go = useGo();

  const goToListPage = () => {
    go({
      to: { resource: "companies", action: "list" },
      options: {
        keepQuery: true,
      },
      type: "replace",
    });
  };

  const { formProps, modalProps } = useModalForm<
    GetFields<CreateCompanyMutation>,
    HttpError,
    GetVariables<CreateCompanyMutationVariables>
  >({
    action: "create",
    defaultVisible: true,
    resource: "companies",
    redirect: false,
    mutationMode: "pessimistic",
    onMutationSuccess: goToListPage,
    meta: {
      gqlMutation: CREATE_COMPANY_MUTATION,
    },
  });

  const { selectProps, queryResult } = useSelect<
    GetFieldsFromList<UsersSelectQuery>
  >({
    resource: "users",
    meta: {
      gqlQuery: USERS_SELECT_QUERY,
    },
    optionLabel: "name",
  });
  
  return (
    <CompanyList>
      <Modal
        {...modalProps}
        mask={true}
        onCancel={goToListPage}
        title="Add new company"
        width={512}
      >
        <Form {...formProps} layout="vertical">
          <Form.Item
            label="Company name"
            name="name"
            rules={[{ required: true }]}
          >
            <Input placeholder="Please enter company name" />
          </Form.Item>
          <Form.Item
            label="Sales owner"
            name="salesOwnerId"
            rules={[{ required: true }]}
          >
            <Select
              placeholder="Please sales owner user"
              {...selectProps}
              options={
                queryResult.data?.data?.map((user) => ({
                  value: user.id,
                  label: (
                    <SelectOptionWithAvatar
                      name={user.name}
                      avatarUrl={user.avatarUrl ?? undefined}
                    />
                  ),
                })) ?? []
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </CompanyList>
  );
};
