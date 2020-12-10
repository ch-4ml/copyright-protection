/*
SPDX-License-Identifier: Apache-2.0
*/

/*

한국저작권보호원 - 문체부 특수사법경찰

*/

package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing copyrights
type SmartContract struct {
	contractapi.Contract
}

// 신고 데이터
type Report struct {
	ObjectType    string `json:"docType"`
	ID            string `json:"id"`            // 신고 ID
	URL           string `json:"url"`           // 복제된 저작물이 게시된 사이트 URL
	Site          string `json:"site"`          // 복제된 저작물이 게시된 사이트 이름
	Title         string `json:"title"`         // 저작물 이름
	ContentType   string `json:"contentType"`   // 저작물 유형
	Author        string `json:"author"`        // 원 저작자 이름
	Pirate        string `json:"pirate"`        // 저작물 게시자
	ReporterEmail string `json:"reporterEmail"` // 신고자 Email
	Date          string `json:"date"`          // 신고 날짜
	Form          string `json:"form"`          // 복제 형태
	Similarity    string `json:"similarity"`    // 유사도(낮거나 측정할 수 없는 경우 사람이 판별)
	Status        string `json:"status"`        // 수사 상태
}

// 신고 조회용 데이터
type ReportQueryResult struct {
	Key    string `json:"Key"`
	Record *Report
}

/* -------------------------- function -------------------------- */

// 저작권 침해 신고 정보 등록
func (s *SmartContract) CreateReport(ctx contractapi.TransactionContextInterface,
	id string, url string, site string, title string, contentType string, author string,
	pirate string, reporterEmail string, date string, form string, similarity string) error {

	objectType := "report"
	key := objectType + id

	report := Report{
		ObjectType:    objectType,
		ID:            key,
		URL:           url,
		Site:          site,
		Title:         title,
		ContentType:   contentType,
		Author:        author,
		Pirate:        pirate,
		ReporterEmail: reporterEmail,
		Date:          date,
		Form:          form,
		Similarity:    similarity,
		Status:        "Pending",
	}

	reportAsBytes, _ := json.Marshal(report)
	return ctx.GetStub().PutState(key, reportAsBytes)
}

// 모든 신고정보 조회
func (s *SmartContract) QueryAllReports(ctx contractapi.TransactionContextInterface) ([]ReportQueryResult, error) {

	queryString := fmt.Sprintf("{\"selector\":{\"docType\":\"report\"}}")
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("Failed to get all reports data from world state. %s", err.Error())
	}
	defer resultsIterator.Close()

	results := []ReportQueryResult{}

	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()

		if err != nil {
			return nil, err
		}

		report := new(Report)
		_ = json.Unmarshal(queryResponse.Value, report)

		queryResult := ReportQueryResult{Key: queryResponse.Key, Record: report}
		results = append(results, queryResult)
	}

	return results, nil
}

// 신고정보 조회
func (s *SmartContract) QueryReport(ctx contractapi.TransactionContextInterface, reportNo string) (*Report, error) {
	key := "report" + reportNo
	reportAsBytes, err := ctx.GetStub().GetState(key)

	if err != nil {
		return nil, fmt.Errorf("Failed to read from world state. %s", err.Error())
	}

	if reportAsBytes == nil {
		return nil, fmt.Errorf("%s does not exist", key)
	}

	report := new(Report)
	_ = json.Unmarshal(reportAsBytes, report)

	return report, nil
}

// 신고 - 수사 상태 변경
func (s *SmartContract) ChangeReportStatus(ctx contractapi.TransactionContextInterface, reportNo string, status string) error {
	report, err := s.QueryReport(ctx, reportNo)

	if err != nil {
		return err
	}

	report.Status = status
	reportAsBytes, _ := json.Marshal(report)

	key := "report" + reportNo

	return ctx.GetStub().PutState(key, reportAsBytes)
}

func main() {

	chaincode, err := contractapi.NewChaincode(new(SmartContract))

	if err != nil {
		fmt.Printf("Error create fabcar chaincode: %s", err.Error())
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting fabcar chaincode: %s", err.Error())
	}
}
