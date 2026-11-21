import { NextRequest, NextResponse } from "next/server";
import {
  ListStateMachinesCommand,
  DescribeStateMachineCommand,
  CreateStateMachineCommand,
  DeleteStateMachineCommand,
  ListExecutionsCommand,
  DescribeExecutionCommand,
  GetExecutionHistoryCommand,
  StartExecutionCommand,
  StopExecutionCommand,
} from "@aws-sdk/client-sfn";
import { getStepFunctionsClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const action = searchParams.get("action") || "list";
    const stateMachineArn = searchParams.get("stateMachineArn") || undefined;
    const executionArn = searchParams.get("executionArn") || undefined;

    const client = getStepFunctionsClient(endpoint);

    if (action === "describe_machine" && stateMachineArn) {
      const [machineRes, execRes] = await Promise.allSettled([
        client.send(new DescribeStateMachineCommand({ stateMachineArn })),
        client.send(new ListExecutionsCommand({ stateMachineArn, maxResults: 50 })),
      ]);
      return NextResponse.json({
        machine: machineRes.status === "fulfilled" ? machineRes.value : null,
        executions:
          execRes.status === "fulfilled" ? execRes.value.executions || [] : [],
      });
    }

    if (action === "describe_execution" && executionArn) {
      const [execRes, histRes] = await Promise.allSettled([
        client.send(new DescribeExecutionCommand({ executionArn })),
        client.send(
          new GetExecutionHistoryCommand({
            executionArn,
            maxResults: 100,
            reverseOrder: true,
          })
        ),
      ]);
      return NextResponse.json({
        execution: execRes.status === "fulfilled" ? execRes.value : null,
        events: histRes.status === "fulfilled" ? histRes.value.events || [] : [],
      });
    }

    const res = await client.send(new ListStateMachinesCommand({}));
    const stateMachines = res.stateMachines || [];
    return NextResponse.json({
      stateMachines,
      count: stateMachines.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch Step Functions resources" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const body = await req.json();
    const { action } = body;

    const client = getStepFunctionsClient(endpoint);

    if (action === "create_state_machine") {
      const res = await client.send(
        new CreateStateMachineCommand({
          name: body.name,
          definition: body.definition,
          roleArn:
            body.roleArn ||
            "arn:aws:iam::000000000000:role/StepFunctionsExecutionRole",
          type: body.type || "STANDARD",
        })
      );
      return NextResponse.json({
        success: true,
        stateMachineArn: res.stateMachineArn,
      });
    }

    if (action === "delete_state_machine") {
      await client.send(
        new DeleteStateMachineCommand({
          stateMachineArn: body.stateMachineArn,
        })
      );
      return NextResponse.json({ success: true });
    }

    if (action === "start_execution") {
      const res = await client.send(
        new StartExecutionCommand({
          stateMachineArn: body.stateMachineArn,
          name: body.name || undefined,
          input: body.input || "{}",
        })
      );
      return NextResponse.json({
        success: true,
        executionArn: res.executionArn,
        startDate: res.startDate,
      });
    }

    if (action === "stop_execution") {
      await client.send(
        new StopExecutionCommand({
          executionArn: body.executionArn,
          cause: body.cause || "Stopped from Floci Console",
        })
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Step Functions operation failed" },
      { status: 500 }
    );
  }
}
