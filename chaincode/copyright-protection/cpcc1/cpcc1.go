/*
SPDX-License-Identifier: Apache-2.0
*/

/*

한국저작권보호원 - 한국저작권위원회

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

// 저작권 데이터
type Copyright struct {
	ObjectType  string `json:"docType"`
	ID          string `json:"id"`          // 등록된 저작물 ID
	Title       string `json:"title"`       // 저작물 이름
	ContentType string `json:"contentType"` // 저작물 유형
	Author      string `json:"author"`      // 원 저작자 이름
}

// 저작권 조회용 데이터
type CopyrightQueryResult struct {
	Key    string `json:"Key"`
	Record *Copyright
}

// 신고 데이터
type Report struct {
	ObjectType    string `json:"docType"`
	ID            string `json:"id"`            // 신고 ID
	URL           string `json:"url"`           // 복제된 저작물이 게시된 사이트 URL
	Site          string `json:"site"`          // 복제된 저작물이 게시된 사이트 이름
	CopyrightID   string `json:"copyrightID"`   // 등록된 저작물 ID
	Pirate        string `json:"pirate"`        // 저작물 게시자
	ReporterEmail string `json:"reporterEmail"` // 신고자 Email
	Date          string `json:"date"`          // 신고 날짜
	Form          string `json:"form"`          // 침해 형태
	Similarity    string `json:"similarity"`    // 유사도(낮거나 측정할 수 없는 경우 사람이 판별)
	IsPirated     string `json:"isPirated"`     // 침해 여부(pending, false, true)
}

// 신고 조회용 데이터
type ReportQueryResult struct {
	Key    string `json:"Key"`
	Record *Report
}

/* -------------------------- function -------------------------- */

// 저작권 데이터 등록
func (s *SmartContract) RegistCopyright(ctx contractapi.TransactionContextInterface,
	copyrightNo string, title string, contentType string, author string) error {
	var err error

	objectType := "copyright"
	key := objectType + copyrightNo

	copyright := Copyright{
		ObjectType:  objectType,
		ID:          key,
		Title:       title,
		ContentType: contentType,
		Author:      author,
	}

	copyrightAsBytes, _ := json.Marshal(copyright)

	err = ctx.GetStub().PutState(key, copyrightAsBytes)
	if err != nil {
		return fmt.Errorf("Failed to put to world state. %s", err.Error())
	}

	index := "author~id"
	authorIDIndexKey, err := ctx.GetStub().CreateCompositeKey(index, []string{copyright.Author, copyright.ID})
	if err != nil {
		return fmt.Errorf("Failed to create composite key. %s", err.Error())
	}

	value := []byte{0x00}
	return ctx.GetStub().PutState(authorIDIndexKey, value)
}

// 모든 저작권 데이터 조회
func (s *SmartContract) QueryAllCopyrights(ctx contractapi.TransactionContextInterface) ([]CopyrightQueryResult, error) {

	queryString := fmt.Sprintf("{\"selector\":{\"docType\":\"copyright\"}}")
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("Failed to get all copyrights data from world state. %s", err.Error())
	}
	defer resultsIterator.Close()

	results := []CopyrightQueryResult{}

	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()

		if err != nil {
			return nil, err
		}

		copyright := new(Copyright)
		_ = json.Unmarshal(queryResponse.Value, copyright)

		queryResult := CopyrightQueryResult{Key: queryResponse.Key, Record: copyright}
		results = append(results, queryResult)
	}

	return results, nil
}

// 원작자로 데이터 조회
func (s *SmartContract) QueryCopyrightsByAuthor(ctx contractapi.TransactionContextInterface, author string) ([]CopyrightQueryResult, error) {

	queryString := fmt.Sprintf("{\"selector\":{\"docType\":\"copyright\", \"author\":\"%s\"}}", author)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("Failed to get all copyrights data from world state. %s", err.Error())
	}
	defer resultsIterator.Close()

	results := []CopyrightQueryResult{}

	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()

		if err != nil {
			return nil, err
		}

		copyright := new(Copyright)
		_ = json.Unmarshal(queryResponse.Value, copyright)

		queryResult := CopyrightQueryResult{Key: queryResponse.Key, Record: copyright}
		results = append(results, queryResult)
	}

	return results, nil
}

// 신고정보 조회
func (s *SmartContract) QueryCopyright(ctx contractapi.TransactionContextInterface, copyrightNo string) (*Copyright, error) {

	objectType := "copyright"
	key := objectType + copyrightNo

	copyrightAsBytes, err := ctx.GetStub().GetState(key)

	if err != nil {
		return nil, fmt.Errorf("Failed to read from world state. %s", err.Error())
	}

	if copyrightAsBytes == nil {
		return nil, fmt.Errorf("%s does not exist", key)
	}

	copyright := new(Copyright)
	_ = json.Unmarshal(copyrightAsBytes, copyright)

	return copyright, nil
}

// --------------------------

// 저작권 침해 신고 정보 등록
func (s *SmartContract) CreateReport(ctx contractapi.TransactionContextInterface,
	reportNo string, url string, site string, copyrightNo string, pirate string,
	reporterEmail string, date string, form string, similarity string, isPirated string) error {
	var err error

	reportID := "report" + reportNo
	copyrightID := "copyright" + copyrightNo

	report := Report{
		ObjectType:    "report",
		ID:            reportID,
		URL:           url,
		Site:          site,
		CopyrightID:   copyrightID,
		Pirate:        pirate,
		ReporterEmail: reporterEmail,
		Date:          date,
		Form:          form,
		Similarity:    similarity,
		IsPirated:     isPirated,
	}

	reportAsBytes, _ := json.Marshal(report)
	err = ctx.GetStub().PutState(reportID, reportAsBytes)
	if err != nil {
		return fmt.Errorf("Failed to put to world state. %s", err.Error())
	}

	index := "copyrightid~id"
	copyrightIDIndexKey, err := ctx.GetStub().CreateCompositeKey(index, []string{report.CopyrightID, report.ID})
	if err != nil {
		return fmt.Errorf("Failed to create composite key. %s", err.Error())
	}

	value := []byte{0x00}
	return ctx.GetStub().PutState(copyrightIDIndexKey, value)
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
func (s *SmartContract) QueryReport(ctx contractapi.TransactionContextInterface, id string) (*Report, error) {
	reportAsBytes, err := ctx.GetStub().GetState(id)

	if err != nil {
		return nil, fmt.Errorf("Failed to read from world state. %s", err.Error())
	}

	if reportAsBytes == nil {
		return nil, fmt.Errorf("%s does not exist", id)
	}

	report := new(Report)
	_ = json.Unmarshal(reportAsBytes, report)

	return report, nil
}

// 신고 - 침해여부 변경
func (s *SmartContract) ChangeReportIsPirated(ctx contractapi.TransactionContextInterface, reportID string, isPirated string) error {
	report, err := s.QueryReport(ctx, reportID)

	if err != nil {
		return err
	}

	report.IsPirated = isPirated

	reportAsBytes, _ := json.Marshal(report)

	return ctx.GetStub().PutState(reportID, reportAsBytes)
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
